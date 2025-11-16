import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('pricing-plans')
  async getPricingPlans() {
    return this.stripeService.getActivePricingPlans();
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @CurrentUser() user: any,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    return this.stripeService.createCheckoutSession(
      user._id.toString(),
      createCheckoutDto.interval,
      user.email,
    );
  }

  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@CurrentUser() user: any) {
    return this.stripeService.createPortalSession(user._id.toString());
  }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@CurrentUser() user: any) {
    return this.stripeService.cancelSubscription(user._id.toString());
  }

  @Post('reactivate-subscription')
  @UseGuards(JwtAuthGuard)
  async reactivateSubscription(@CurrentUser() user: any) {
    return this.stripeService.reactivateSubscription(user._id.toString());
  }
}

