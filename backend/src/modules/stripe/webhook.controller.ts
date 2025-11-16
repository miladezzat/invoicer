import {
  Controller,
  Post,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';

// Separate controller for webhook to avoid global prefix
@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('Webhook received:');
    console.log('- Has rawBody:', !!req.rawBody);
    console.log('- Has signature:', !!signature);
    console.log('- rawBody type:', req.rawBody?.constructor.name);
    
    if (!req.rawBody) {
      throw new Error('Raw body not available');
    }
    
    if (!signature) {
      throw new Error('Stripe signature header not found');
    }
    
    await this.stripeService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}

