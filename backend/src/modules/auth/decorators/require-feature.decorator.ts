import { SetMetadata } from '@nestjs/common';
import { Feature } from '../../../config/features.config';

export const FEATURE_KEY = 'feature';

/**
 * Decorator to require a specific feature for accessing an endpoint
 * 
 * @example
 * ```typescript
 * @Post()
 * @RequireFeature(Feature.SAVE_INVOICE)
 * @UseGuards(JwtAuthGuard, FeatureGuard)
 * async saveInvoice(@CurrentUser() user: User) {
 *   // Only users with SAVE_INVOICE feature can access this
 * }
 * ```
 */
export const RequireFeature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);

