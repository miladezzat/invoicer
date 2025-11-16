import {
  Controller,
  Post,
  Get,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { StripeConnectService } from './connect.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Feature } from '../../config/features.config';

@Controller('stripe/connect')
@UseGuards(JwtAuthGuard)
export class StripeConnectController {
  private readonly logger = new Logger(StripeConnectController.name);

  constructor(private readonly stripeConnectService: StripeConnectService) {}

  /**
   * Create or reconnect a Stripe Connect account for the user
   * Only Pro users can accept payments
   * IMPORTANT: This prevents duplicate account creation
   */
  @Post('account')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async createAccount(@CurrentUser() user: any) {
    this.logger.log(`Creating/reconnecting Stripe Connect account for user ${user._id}`);

    // Check if user already has a CONNECTED account
    if (user.stripeConnect?.accountId && user.stripeConnect?.connected !== false) {
      return {
        accountId: user.stripeConnect.accountId,
        alreadyExists: true,
        reconnected: false,
      };
    }

    // Create new or reconnect disconnected account
    const result = await this.stripeConnectService.createConnectAccount(
      user._id.toString(),
      user.email,
      {
        businessName: user.settings?.company || user.name,
        country: 'US', // Default, can be updated
      }
    );

    return {
      accountId: result.accountId,
      alreadyExists: false,
      reconnected: result.reconnected,
    };
  }

  /**
   * Get onboarding link for user to complete Stripe Connect setup
   */
  @Get('onboarding-link')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async getOnboardingLink(@CurrentUser() user: any) {
    if (!user.stripeConnect?.accountId) {
      throw new ForbiddenException(
        'Please create a Stripe Connect account first'
      );
    }

    const { url, expiresAt } = await this.stripeConnectService.createAccountLink(
      user.stripeConnect.accountId,
      'account_onboarding'
    );

    return {
      url,
      expiresAt,
    };
  }

  /**
   * Get dashboard link for user to manage their Stripe account
   */
  @Get('dashboard-link')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async getDashboardLink(@CurrentUser() user: any) {
    if (!user.stripeConnect?.accountId) {
      throw new ForbiddenException('No Stripe Connect account found');
    }

    if (!user.stripeConnect?.onboardingComplete) {
      throw new ForbiddenException('Please complete onboarding first');
    }

    const { url } = await this.stripeConnectService.createLoginLink(
      user.stripeConnect.accountId
    );

    return {
      url,
    };
  }

  /**
   * Get current account status
   */
  @Get('status')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async getAccountStatus(@CurrentUser() user: any) {
    if (!user.stripeConnect?.accountId || user.stripeConnect?.connected === false) {
      return {
        connected: false,
        accountId: user.stripeConnect?.accountId || null,
        wasDisconnected: user.stripeConnect?.connected === false,
        disconnectedAt: user.stripeConnect?.disconnectedAt || null,
      };
    }

    const accountInfo = await this.stripeConnectService.getAccountInfo(
      user.stripeConnect.accountId
    );

    return {
      connected: true,
      accountId: user.stripeConnect.accountId,
      connectedAt: user.stripeConnect.connectedAt,
      ...accountInfo,
    };
  }

  /**
   * Refresh account status from Stripe
   * Useful after user completes onboarding
   */
  @Post('refresh')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async refreshAccountStatus(@CurrentUser() user: any) {
    if (!user.stripeConnect?.accountId) {
      throw new ForbiddenException('No Stripe Connect account found');
    }

    await this.stripeConnectService.syncAccountStatus(
      user._id.toString(),
      user.stripeConnect.accountId
    );

    // Return updated status
    return this.getAccountStatus(user);
  }

  /**
   * Disconnect Stripe Connect account
   * This will remove the connection but keep historical data
   */
  @Post('disconnect')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async disconnectAccount(@CurrentUser() user: any) {
    if (!user.stripeConnect?.accountId) {
      throw new ForbiddenException('No Stripe Connect account found');
    }

    const accountId = user.stripeConnect.accountId;
    
    this.logger.log(`Disconnecting Stripe account ${accountId} for user ${user._id}`);

    await this.stripeConnectService.disconnectAccount(
      user._id.toString(),
      accountId
    );

    return {
      success: true,
      message: 'Stripe account disconnected successfully. You can reconnect or connect a different account at any time.',
    };
  }
}

