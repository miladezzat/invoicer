import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private stripe: Stripe;
  private readonly frontendUrl: string;
  private readonly platformFeePercentage: number;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });

    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.platformFeePercentage = parseFloat(
      this.configService.get<string>('PLATFORM_FEE_PERCENTAGE') || '0.01'
    );

    this.logger.log(`Platform fee configured: ${(this.platformFeePercentage * 100).toFixed(2)}%`);
  }

  /**
   * Create or reconnect a Stripe Connect Express account for a user
   * IMPORTANT: This checks for previously disconnected accounts to prevent duplicates
   */
  async createConnectAccount(
    userId: string,
    email: string,
    options: {
      businessName?: string;
      country?: string;
    } = {}
  ): Promise<{ accountId: string; reconnected: boolean }> {
    try {
      // CRITICAL: Check if user has a disconnected account first
      const user = await this.userModel.findById(userId).exec();
      
      if (user?.stripeConnect?.accountId) {
        // User has an existing account - reconnect it
        const existingAccountId = user.stripeConnect.accountId;
        
        this.logger.log(
          `Reconnecting existing Stripe account ${existingAccountId} for user ${userId} (preventing duplicate creation)`
        );

        // Verify the account still exists on Stripe
        try {
          await this.stripe.accounts.retrieve(existingAccountId);
          
          // Reconnect the existing account
          await this.userModel.findByIdAndUpdate(userId, {
            'stripeConnect.connected': true,
            'stripeConnect.connectedAt': new Date(),
            $unset: { 'stripeConnect.disconnectedAt': '' },
          });

          this.logger.log(`Successfully reconnected existing account ${existingAccountId}`);
          
          return { accountId: existingAccountId, reconnected: true };
        } catch (stripeError) {
          // Account doesn't exist on Stripe anymore (deleted)
          this.logger.warn(
            `Previous Stripe account ${existingAccountId} no longer exists, creating new one`
          );
          // Fall through to create new account
        }
      }

      // No existing account or it was deleted - create new one
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: options.country || 'US',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Can be 'company' if needed
        metadata: {
          userId,
        },
      });

      this.logger.log(`Created new Stripe Connect account ${account.id} for user ${userId}`);

      // Save account ID to user
      await this.userModel.findByIdAndUpdate(userId, {
        'stripeConnect.accountId': account.id,
        'stripeConnect.accountType': 'express',
        'stripeConnect.accountStatus': 'pending',
        'stripeConnect.connected': true,
        'stripeConnect.onboardingComplete': false,
        'stripeConnect.chargesEnabled': false,
        'stripeConnect.payoutsEnabled': false,
        'stripeConnect.connectedAt': new Date(),
        'stripeConnect.country': options.country || 'US',
        $unset: { 'stripeConnect.disconnectedAt': '' },
      });

      return { accountId: account.id, reconnected: false };
    } catch (error) {
      this.logger.error(`Failed to create/reconnect Connect account for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create account link for onboarding or updating account info
   */
  async createAccountLink(
    accountId: string,
    type: 'account_onboarding' | 'account_update' = 'account_onboarding'
  ): Promise<{ url: string; expiresAt: number }> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${this.frontendUrl}/app/settings?refresh=true`,
        return_url: `${this.frontendUrl}/app/settings?connected=true`,
        type,
      });

      this.logger.log(`Created account link for ${accountId}`);

      return {
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
      };
    } catch (error) {
      this.logger.error(`Failed to create account link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create login link for user to access their Stripe dashboard
   */
  async createLoginLink(accountId: string): Promise<{ url: string }> {
    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);

      this.logger.log(`Created login link for ${accountId}`);

      return {
        url: loginLink.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create login link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get account information from Stripe
   */
  async getAccountInfo(accountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    onboardingComplete: boolean;
    accountStatus: string;
    requirements: any;
  }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      const accountStatus = this.determineAccountStatus(account);
      const onboardingComplete = account.details_submitted && account.charges_enabled;

      return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingComplete,
        accountStatus,
        requirements: account.requirements,
      };
    } catch (error) {
      this.logger.error(`Failed to get account info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync account status from Stripe to database
   */
  async syncAccountStatus(userId: string, accountId: string): Promise<void> {
    try {
      const accountInfo = await this.getAccountInfo(accountId);

      await this.userModel.findByIdAndUpdate(userId, {
        'stripeConnect.accountStatus': accountInfo.accountStatus,
        'stripeConnect.onboardingComplete': accountInfo.onboardingComplete,
        'stripeConnect.chargesEnabled': accountInfo.chargesEnabled,
        'stripeConnect.payoutsEnabled': accountInfo.payoutsEnabled,
        'stripeConnect.detailsSubmitted': accountInfo.detailsSubmitted,
      });

      this.logger.log(`Synced account status for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync account status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a checkout session for invoice payment
   */
  async createPaymentSession(
    invoiceId: string,
    amount: number,
    currency: string,
    connectedAccountId: string,
    publicToken: string,
    metadata: {
      userId: string;
      invoiceNumber: string;
      clientEmail?: string;
    }
  ): Promise<{ sessionId: string; url: string }> {
    try {
      // Calculate platform fee
      const platformFeeAmount = Math.round(amount * this.platformFeePercentage);

      this.logger.log(
        `Creating payment session for invoice ${invoiceId}: ` +
        `Amount: ${amount / 100} ${currency}, ` +
        `Platform fee: ${platformFeeAmount / 100} ${currency} (${(this.platformFeePercentage * 100).toFixed(2)}%)`
      );

      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency.toLowerCase(),
                unit_amount: amount,
                product_data: {
                  name: `Invoice ${metadata.invoiceNumber}`,
                  description: `Payment for invoice ${metadata.invoiceNumber}`,
                },
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: platformFeeAmount,
            metadata: {
              invoiceId,
              userId: metadata.userId,
              invoiceNumber: metadata.invoiceNumber,
              platformFee: platformFeeAmount.toString(),
            },
          },
          success_url: `${this.frontendUrl}/i/${publicToken}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${this.frontendUrl}/i/${publicToken}?payment=cancelled`,
          metadata: {
            invoiceId,
            userId: metadata.userId,
            invoiceNumber: metadata.invoiceNumber,
          },
          customer_email: metadata.clientEmail,
        },
        {
          stripeAccount: connectedAccountId,
        }
      );

      this.logger.log(`Created checkout session ${session.id} for invoice ${invoiceId}`);

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      this.logger.error(`Failed to create payment session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get platform fee percentage
   */
  getPlatformFeePercentage(): number {
    return this.platformFeePercentage;
  }

  /**
   * Calculate platform fee for an amount
   */
  calculatePlatformFee(amount: number): number {
    return Math.round(amount * this.platformFeePercentage);
  }

  /**
   * Determine account status based on Stripe account object
   */
  private determineAccountStatus(account: Stripe.Account): string {
    if (!account.charges_enabled && !account.payouts_enabled) {
      return 'restricted';
    }
    if (!account.details_submitted) {
      return 'pending';
    }
    if (account.charges_enabled && account.payouts_enabled) {
      return 'active';
    }
    return 'pending';
  }

  /**
   * Construct and verify webhook event
   * Used by webhook controller to verify Stripe signatures
   */
  async constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured');
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Sync account status by Stripe account ID
   * Used by webhook to update user's Connect status
   */
  async syncAccountStatusByAccountId(accountId: string): Promise<void> {
    try {
      // Find user by Stripe account ID
      const user = await this.userModel.findOne({
        'stripeConnect.accountId': accountId,
      }).exec();

      if (!user) {
        this.logger.warn(`User not found for Stripe account ${accountId}`);
        return;
      }

      // Fetch fresh account data from Stripe
      const account = await this.stripe.accounts.retrieve(accountId);

      // Update user's Connect info
      user.stripeConnect = {
        ...user.stripeConnect,
        accountId: account.id,
        accountType: account.type as 'express' | 'standard' | 'custom',
        accountStatus: this.determineAccountStatus(account) as any,
        onboardingComplete: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        country: account.country,
        defaultCurrency: account.default_currency,
      };

      await user.save();

      this.logger.log(
        `Synced Connect account for user ${user._id}: ` +
        `charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`
      );
    } catch (error) {
      this.logger.error(`Error syncing account ${accountId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect Stripe Connect account
   * Marks the account as disconnected but preserves all data
   * This prevents creating duplicate accounts on reconnection
   * Historical invoices remain and payment links stay functional
   */
  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    try {
      this.logger.log(
        `Disconnecting Stripe Connect account ${accountId} for user ${userId}`
      );

      // CRITICAL: We mark the account as disconnected but PRESERVE the accountId
      // This prevents creating duplicate Stripe accounts when user reconnects
      // The Stripe account itself is NOT deleted from Stripe's side
      await this.userModel.findByIdAndUpdate(userId, {
        'stripeConnect.connected': false,
        'stripeConnect.disconnectedAt': new Date(),
      });

      this.logger.log(
        `Successfully disconnected Stripe account ${accountId} from user ${userId} (account preserved for reconnection)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to disconnect account ${accountId} for user ${userId}: ${error.message}`
      );
      throw error;
    }
  }
}

