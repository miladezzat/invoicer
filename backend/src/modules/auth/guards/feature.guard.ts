import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { Feature, hasFeature, PlanTier } from '../../../config/features.config';

/**
 * Guard to check if the authenticated user has access to a specific feature
 * based on their subscription plan.
 * 
 * Must be used with JwtAuthGuard and RequireFeature decorator.
 * 
 * @example
 * ```typescript
 * @Post()
 * @RequireFeature(Feature.SAVE_INVOICE)
 * @UseGuards(JwtAuthGuard, FeatureGuard)
 * async saveInvoice(@CurrentUser() user: User) {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<Feature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no feature is required, allow access
    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('FeatureGuard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    // Get user's plan tier (default to 'free' if not set)
    const userPlan: PlanTier = user.plan?.tier || 'free';

    // Check if user's plan has access to the required feature
    const hasAccess = hasFeature(userPlan, requiredFeature);

    if (!hasAccess) {
      this.logger.warn(
        `FeatureGuard: User ${user._id} (plan: ${userPlan}) denied access to feature: ${requiredFeature}`,
      );
      throw new ForbiddenException(
        `This feature requires a premium plan. Please upgrade to access ${requiredFeature}.`,
      );
    }

    this.logger.debug(
      `FeatureGuard: User ${user._id} (plan: ${userPlan}) granted access to feature: ${requiredFeature}`,
    );

    return true;
  }
}

