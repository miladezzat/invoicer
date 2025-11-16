import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiKeysService, CreateApiKeyDto, ApiKeyResponse } from './api-keys.service';
import { ApiAnalyticsService } from './api-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Feature } from '../../config/features.config';

@Controller('developer/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly apiAnalyticsService: ApiAnalyticsService,
  ) {}

  /**
   * Create a new API key
   */
  @Post()
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async createApiKey(
    @CurrentUser() user: any,
    @Body() createDto: CreateApiKeyDto,
  ): Promise<{ success: boolean; data: ApiKeyResponse }> {
    this.logger.log(`Creating API key for user ${user._id}: ${createDto.name}`);

    const apiKey = await this.apiKeysService.createApiKey(
      user._id.toString(),
      createDto,
    );

    return {
      success: true,
      data: apiKey,
    };
  }

  /**
   * List all API keys
   */
  @Get()
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async listApiKeys(
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; data: ApiKeyResponse[] }> {
    const apiKeys = await this.apiKeysService.listApiKeys(user._id.toString());

    return {
      success: true,
      data: apiKeys,
    };
  }

  /**
   * Delete an API key
   */
  @Delete(':keyId')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async deleteApiKey(
    @CurrentUser() user: any,
    @Param('keyId') keyId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting API key ${keyId} for user ${user._id}`);

    await this.apiKeysService.deleteApiKey(user._id.toString(), keyId);

    return {
      success: true,
      message: 'API key deleted successfully',
    };
  }

  /**
   * Toggle API key active status
   */
  @Patch(':keyId/toggle')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async toggleApiKey(
    @CurrentUser() user: any,
    @Param('keyId') keyId: string,
    @Body('isActive') isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Toggling API key ${keyId} to ${isActive} for user ${user._id}`);

    await this.apiKeysService.toggleApiKey(user._id.toString(), keyId, isActive);

    return {
      success: true,
      message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  /**
   * Get API key statistics
   */
  @Get('stats')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async getStats(
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; data: any }> {
    const stats = await this.apiKeysService.getStats(user._id.toString());

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get API analytics (overall stats)
   */
  @Get('analytics')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '30d',
  ): Promise<{ success: boolean; data: any }> {
    const analytics = await this.apiAnalyticsService.getStats(
      user._id.toString(),
      period,
    );

    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * Get analytics for a specific API key
   */
  @Get(':keyId/analytics')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async getApiKeyAnalytics(
    @CurrentUser() user: any,
    @Param('keyId') keyId: string,
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '30d',
  ): Promise<{ success: boolean; data: any }> {
    const analytics = await this.apiAnalyticsService.getApiKeyStats(
      user._id.toString(),
      keyId,
      period,
    );

    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * Get recent API requests (for debugging/monitoring)
   */
  @Get('analytics/recent')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async getRecentRequests(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 50,
  ): Promise<{ success: boolean; data: any[] }> {
    const requests = await this.apiAnalyticsService.getRecentRequests(
      user._id.toString(),
      limit,
    );

    return {
      success: true,
      data: requests,
    };
  }
}

