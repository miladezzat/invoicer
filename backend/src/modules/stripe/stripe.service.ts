import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly monthlyPriceId: string;
  private readonly yearlyPriceId: string;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
    
    this.monthlyPriceId = this.configService.get<string>('STRIPE_MONTHLY_PRICE_ID') || '';
    this.yearlyPriceId = this.configService.get<string>('STRIPE_YEARLY_PRICE_ID') || '';
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  async createCheckoutSession(
    userId: string,
    interval: 'month' | 'year',
    userEmail: string,
  ): Promise<{ url: string }> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Select the correct price ID based on interval
    const priceId = interval === 'month' ? this.monthlyPriceId : this.yearlyPriceId;
    
    if (!priceId) {
      throw new Error(`Price ID not configured for ${interval}ly billing`);
    }
    
    let customerId = user.subscription?.customerId;
    
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
      
      await this.userModel.findByIdAndUpdate(userId, {
        'subscription.customerId': customerId,
      });
    }

    // Get frontend URL and ensure it has a scheme
    let frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
      frontendUrl = `http://${frontendUrl}`;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/app/subscription?success=true`,
      cancel_url: `${frontendUrl}/pricing?canceled=true`,
      
      // Billing configuration
      payment_method_collection: 'always', // Always collect payment method
      
      // Subscription configuration
      subscription_data: {
        metadata: {
          userId,
        },
        // Automatic collection and retry logic
        // collection_method defaults to 'charge_automatically'
        // This ensures Stripe automatically charges the customer
      },
      
      metadata: {
        userId,
      },
      
      // Allow promotional codes (optional)
      allow_promotion_codes: true,
    });

    return { url: session.url || '' };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.subscription?.customerId) {
      throw new Error('No Stripe customer found. Please subscribe to a plan first.');
    }

    // Get frontend URL and ensure it has a scheme
    let frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
      frontendUrl = `http://${frontendUrl}`;
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.subscription.customerId,
      return_url: `${frontendUrl}/app/subscription`,
    });

    return { url: session.url };
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.subscription?.subscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel at period end (not immediately)
    const subscription = await this.stripe.subscriptions.update(
      user.subscription.subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update user record
    await this.userModel.findByIdAndUpdate(userId, {
      'subscription.cancelAtPeriodEnd': true,
    });

    const periodEnd = (subscription as any).current_period_end 
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date();
    this.logger.log(`Subscription scheduled for cancellation for user ${userId} at ${periodEnd}`);

    return {
      success: true,
      message: `Subscription will be cancelled on ${periodEnd.toLocaleDateString()}. You'll keep access until then.`,
    };
  }

  async reactivateSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.subscription?.subscriptionId) {
      throw new Error('No subscription found');
    }

    if (!user.subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    // Remove the cancellation
    const subscription = await this.stripe.subscriptions.update(
      user.subscription.subscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update user record
    await this.userModel.findByIdAndUpdate(userId, {
      'subscription.cancelAtPeriodEnd': false,
    });

    this.logger.log(`Subscription reactivated for user ${userId}`);

    return {
      success: true,
      message: 'Subscription reactivated successfully! Your subscription will continue.',
    };
  }

  async handleWebhook(body: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    this.logger.log('Processing webhook...');
    this.logger.log(`Body type: ${body?.constructor.name}`);
    this.logger.log(`Has webhook secret: ${!!this.webhookSecret}`);
    this.logger.log(`Webhook secret length: ${this.webhookSecret?.length || 0}`);

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.error('No userId in checkout session metadata');
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    await this.updateUserSubscription(userId, subscription);
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // Try to get userId from metadata first
    let userId = subscription.metadata?.userId;
    
    // If no userId in metadata, look up by customerId
    if (!userId) {
      const customerId = subscription.customer as string;
      const user = await this.userModel.findOne({ 'subscription.customerId': customerId });
      
      if (!user) {
        this.logger.error(`No user found for customer ${customerId}`);
        return;
      }
      
      userId = (user._id as any).toString();
      this.logger.log(`Found user ${userId} by customerId ${customerId}`);
    }

    // Check if subscription is being cancelled
    if (subscription.cancel_at_period_end) {
      this.logger.log(`Subscription scheduled for cancellation for user ${userId}`);
    }

    await this.updateUserSubscription(userId, subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Try to get userId from metadata first
    let userId = subscription.metadata?.userId;
    
    // If no userId in metadata, look up by customerId
    if (!userId) {
      const customerId = subscription.customer as string;
      const user = await this.userModel.findOne({ 'subscription.customerId': customerId });
      
      if (!user) {
        this.logger.error(`No user found for customer ${customerId}`);
        return;
      }
      
      userId = (user._id as any).toString();
      this.logger.log(`Found user ${userId} by customerId ${customerId}`);
    }

    await this.userModel.findByIdAndUpdate(userId, {
      'plan.tier': 'free',
      'subscription.status': 'canceled',
      'subscription.cancelAtPeriodEnd': false,
    });

    this.logger.log(`Subscription canceled for user ${userId}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    if (!invoiceData.subscription || typeof invoiceData.subscription !== 'string') return;

    const subscription = await this.stripe.subscriptions.retrieve(
      invoiceData.subscription,
    );
    
    // Try to get userId from metadata first
    let userId = subscription.metadata?.userId;
    
    // If no userId in metadata, look up by customerId
    if (!userId) {
      const customerId = subscription.customer as string;
      const user = await this.userModel.findOne({ 'subscription.customerId': customerId });
      
      if (!user) {
        this.logger.error(`No user found for customer ${customerId}`);
        return;
      }
      
      userId = (user._id as any).toString();
    }

    await this.updateUserSubscription(userId, subscription);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    if (!invoiceData.subscription || typeof invoiceData.subscription !== 'string') return;

    const subscription = await this.stripe.subscriptions.retrieve(
      invoiceData.subscription,
    );
    
    // Try to get userId from metadata first
    let userId = subscription.metadata?.userId;
    
    // If no userId in metadata, look up by customerId
    if (!userId) {
      const customerId = subscription.customer as string;
      const user = await this.userModel.findOne({ 'subscription.customerId': customerId });
      
      if (!user) {
        this.logger.error(`No user found for customer ${customerId}`);
        return;
      }
      
      userId = (user._id as any).toString();
    }

    await this.userModel.findByIdAndUpdate(userId, {
      'subscription.status': subscription.status,
    });

    this.logger.warn(`Payment failed for user ${userId}`);
  }

  private async updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
    const priceId = subscription.items.data[0]?.price.id;
    const interval = subscription.items.data[0]?.price.recurring?.interval;
    
    const isPro = subscription.status === 'active' || subscription.status === 'trialing';
    
    // Safely convert Stripe timestamp to Date
    let currentPeriodEnd: Date | undefined;
    const periodEndTimestamp = (subscription as any).current_period_end;
    if (periodEndTimestamp) {
      try {
        currentPeriodEnd = new Date(periodEndTimestamp * 1000);
        // Validate the date is valid
        if (isNaN(currentPeriodEnd.getTime())) {
          this.logger.error(`Invalid current_period_end timestamp: ${periodEndTimestamp}`);
          currentPeriodEnd = undefined;
        }
      } catch (error) {
        this.logger.error(`Error converting current_period_end: ${error.message}`);
        currentPeriodEnd = undefined;
      }
    }

    const updateData: any = {
      'plan.tier': isPro ? 'pro' : 'free',
      'subscription.subscriptionId': subscription.id,
      'subscription.customerId': subscription.customer as string,
      'subscription.status': subscription.status,
      'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
      'subscription.priceId': priceId,
      'subscription.interval': interval,
    };

    // Only include currentPeriodEnd if it's valid
    if (currentPeriodEnd) {
      updateData['subscription.currentPeriodEnd'] = currentPeriodEnd;
    }

    await this.userModel.findByIdAndUpdate(userId, updateData);

    this.logger.log(`Updated subscription for user ${userId}: ${subscription.status}`);
  }

  getMonthlyPriceId(): string {
    return this.monthlyPriceId;
  }

  getYearlyPriceId(): string {
    return this.yearlyPriceId;
  }

  async getActivePricingPlans() {
    try {
      // Define the default Free plan (not in Stripe)
      const freePlan = {
        id: 'free',
        name: 'Free',
        description: 'Perfect for freelancers and small businesses',
        isFree: true,
        prices: [],
        features: [
          'Unlimited invoices',
          'Beautiful templates',
          'PDF export & print',
          'Shareable links',
          'Basic branding',
          'Email support',
        ],
        metadata: {},
      };

      // Fetch active products from Stripe (paid plans only)
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      // Fetch all active prices for these products
      const prices = await this.stripe.prices.list({
        active: true,
        expand: ['data.product'],
      });

      // Group prices by product
      const productMap = new Map();
      
      products.data.forEach(product => {
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: [],
        });
      });

      // Add prices to their respective products
      prices.data.forEach(price => {
        const productId = typeof price.product === 'string' 
          ? price.product 
          : (price.product as Stripe.Product).id;
        
        if (productMap.has(productId)) {
          const product = productMap.get(productId);
          product.prices.push({
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
          });
        }
      });

      // Convert map to array and format for frontend (paid plans only)
      const paidPlans = Array.from(productMap.values()).map(product => {
        // Sort prices: monthly first, then yearly
        product.prices.sort((a: any, b: any) => {
          if (a.interval === 'month' && b.interval === 'year') return -1;
          if (a.interval === 'year' && b.interval === 'month') return 1;
          return 0;
        });
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          isFree: false,
          prices: product.prices,
          features: product.metadata.features 
            ? JSON.parse(product.metadata.features) 
            : [],
          metadata: product.metadata,
        };
      });

      // Filter out any plans with no prices (just in case)
      const validPaidPlans = paidPlans.filter(plan => plan.prices.length > 0);

      // Return Free plan first, then paid plans
      return [freePlan, ...validPaidPlans];
    } catch (error) {
      this.logger.error(`Error fetching pricing plans from Stripe: ${error.message}`);
      throw error;
    }
  }
}

