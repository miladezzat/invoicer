import { 
  Controller, 
  Post, 
  Req, 
  Headers, 
  RawBodyRequest, 
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeConnectService } from './connect.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';

/**
 * Webhook controller for Stripe Connect payment events
 * Handles checkout.session.completed, payment_intent.*, charge.refunded
 */
@Controller('stripe/webhook-connect')
export class StripeConnectWebhookController {
  private readonly logger = new Logger(StripeConnectWebhookController.name);

  constructor(
    private readonly stripeConnectService: StripeConnectService,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Get raw body for signature verification
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    try {
      // Verify and construct the event
      const event = await this.stripeConnectService.constructWebhookEvent(
        rawBody,
        signature,
      );

      this.logger.log(`Received webhook event: ${event.type} (${event.id})`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object, event.account);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Handle successful checkout session
   */
  private async handleCheckoutSessionCompleted(session: any) {
    this.logger.log(`Checkout completed: ${session.id}`);

    // Extract invoice ID from metadata
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      this.logger.warn('No invoiceId in session metadata');
      return;
    }

    // Update invoice status to processing
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found`);
      return;
    }

    // Update payment info
    invoice.payment = {
      ...invoice.payment,
      enabled: true,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      status: 'processing',
    };

    await invoice.save();
    this.logger.log(`Invoice ${invoice.number} marked as processing`);
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    // Try to find invoice by payment intent ID first
    let invoice = await this.invoiceModel
      .findOne({ 'payment.stripePaymentIntentId': paymentIntent.id })
      .exec();

    // If not found by payment intent ID, try using metadata (for race condition)
    if (!invoice && paymentIntent.metadata?.invoiceId) {
      this.logger.log(`Trying to find invoice by metadata: ${paymentIntent.metadata.invoiceId}`);
      invoice = await this.invoiceModel.findById(paymentIntent.metadata.invoiceId).exec();
    }

    if (!invoice) {
      this.logger.warn(`Invoice not found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Extract payment details
    const amountReceived = paymentIntent.amount_received; // in cents
    const platformFeeAmount = paymentIntent.application_fee_amount || 0; // in cents
    const paymentMethod = paymentIntent.payment_method_types?.[0] || 'card';
    const receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url;

    // Calculate fees
    const stripeFee = Math.round(amountReceived * 0.029 + 30); // Stripe's standard fee
    const netAmount = amountReceived - platformFeeAmount - stripeFee;

    // Update invoice
    invoice.status = 'paid';
    invoice.payment = {
      ...invoice.payment,
      enabled: true,
      stripePaymentIntentId: paymentIntent.id,
      status: 'paid',
      paidAt: new Date(),
      paidAmount: amountReceived / 100,
      platformFee: platformFeeAmount / 100,
      stripeFee: stripeFee / 100,
      netAmount: netAmount / 100,
      paymentMethod,
      receiptUrl,
    };

    invoice.amountPaid = amountReceived / 100;
    invoice.balanceDue = 0;

    invoice.activity.push({
      at: new Date(),
      type: 'paid',
      meta: {
        amount: amountReceived / 100,
        method: paymentMethod,
        paymentIntentId: paymentIntent.id,
      },
    });

    await invoice.save();

    this.logger.log(
      `Invoice ${invoice.number} marked as paid. ` +
      `Amount: $${(amountReceived / 100).toFixed(2)}, ` +
      `Platform Fee: $${(platformFeeAmount / 100).toFixed(2)}, ` +
      `Net: $${(netAmount / 100).toFixed(2)}`
    );

    // TODO: Send payment confirmation email
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: any) {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    // Try to find invoice by payment intent ID first
    let invoice = await this.invoiceModel
      .findOne({ 'payment.stripePaymentIntentId': paymentIntent.id })
      .exec();

    // If not found by payment intent ID, try using metadata
    if (!invoice && paymentIntent.metadata?.invoiceId) {
      this.logger.log(`Trying to find invoice by metadata: ${paymentIntent.metadata.invoiceId}`);
      invoice = await this.invoiceModel.findById(paymentIntent.metadata.invoiceId).exec();
    }

    if (!invoice) {
      this.logger.warn(`Invoice not found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Extract failure reason
    const failureReason =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    // Update invoice
    invoice.payment = {
      ...invoice.payment,
      status: 'failed',
      failureReason,
    };

    invoice.activity.push({
      at: new Date(),
      type: 'payment_failed',
      meta: {
        reason: failureReason,
        paymentIntentId: paymentIntent.id,
      },
    });

    await invoice.save();

    this.logger.log(`Invoice ${invoice.number} payment failed: ${failureReason}`);

    // TODO: Send payment failure notification email
  }

  /**
   * Handle charge refund
   */
  private async handleChargeRefunded(charge: any) {
    this.logger.log(`Charge refunded: ${charge.id}`);

    // Find invoice by payment intent ID
    const invoice = await this.invoiceModel
      .findOne({ 'payment.stripePaymentIntentId': charge.payment_intent })
      .exec();

    if (!invoice) {
      this.logger.warn(`Invoice not found for charge ${charge.id}`);
      return;
    }

    const refundAmount = charge.amount_refunded / 100;
    const isFullRefund = charge.refunded;

    // Update invoice
    invoice.payment = {
      ...invoice.payment,
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAt: new Date(),
      refundAmount,
    };

    if (isFullRefund) {
      invoice.status = 'cancelled';
      invoice.amountPaid = 0;
      invoice.balanceDue = invoice.total;
    } else {
      invoice.amountPaid = (invoice.amountPaid || 0) - refundAmount;
      invoice.balanceDue = invoice.total - (invoice.amountPaid || 0);
    }

    invoice.activity.push({
      at: new Date(),
      type: 'refunded',
      meta: {
        amount: refundAmount,
        isFullRefund,
        chargeId: charge.id,
      },
    });

    await invoice.save();

    this.logger.log(
      `Invoice ${invoice.number} ${isFullRefund ? 'fully' : 'partially'} refunded. ` +
      `Amount: $${refundAmount.toFixed(2)}`
    );

    // TODO: Send refund notification email
  }

  /**
   * Handle Stripe Connect account updates
   */
  private async handleAccountUpdated(account: any, accountId?: string) {
    const connectedAccountId = accountId || account.id;
    this.logger.log(`Account updated: ${connectedAccountId}`);

    // Sync account status
    try {
      await this.stripeConnectService.syncAccountStatusByAccountId(connectedAccountId);
      this.logger.log(`Synced account status for ${connectedAccountId}`);
    } catch (error) {
      this.logger.error(`Failed to sync account ${connectedAccountId}: ${error.message}`);
    }
  }
}

