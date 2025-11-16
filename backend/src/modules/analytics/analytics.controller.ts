import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Feature } from '../../config/features.config';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get analytics summary
   * Only accessible to Pro users
   */
  @Get()
  @RequireFeature(Feature.ANALYTICS)
  @UseGuards(FeatureGuard)
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('period') period?: '30d' | '90d' | '1y' | 'all',
  ) {
    this.logger.log(`Getting analytics for user ${user._id}, period: ${period || '30d'}`);
    
    const validPeriod = period && ['30d', '90d', '1y', 'all'].includes(period) 
      ? period 
      : '30d';

    const analytics = await this.analyticsService.getAnalytics(
      user._id.toString(),
      validPeriod,
    );

    return {
      success: true,
      data: analytics,
      period: validPeriod,
    };
  }

  /**
   * Export analytics data
   * Only accessible to Pro users
   */
  @Get('export')
  @RequireFeature(Feature.REPORTS)
  @UseGuards(FeatureGuard)
  async exportAnalytics(
    @CurrentUser() user: any,
    @Query('format') format?: 'csv' | 'json',
  ) {
    this.logger.log(`Exporting analytics for user ${user._id}, format: ${format || 'json'}`);
    
    const validFormat = format && ['csv', 'json'].includes(format) 
      ? format 
      : 'json';

    const data = await this.analyticsService.exportAnalytics(
      user._id.toString(),
      validFormat,
    );

    return {
      success: true,
      format: validFormat,
      data,
    };
  }
}

