import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { WebhooksService, CreateWebhookDto, WebhookResponse } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Feature } from '../../config/features.config';
import { WebhookEvent } from '../../schemas/webhook.schema';

@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Create a new webhook
   */
  @Post()
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async createWebhook(
    @CurrentUser() user: any,
    @Body() createDto: CreateWebhookDto,
  ): Promise<{ success: boolean; data: WebhookResponse; message: string }> {
    this.logger.log(`Creating webhook for user ${user._id}: ${createDto.url}`);

    const webhook = await this.webhooksService.createWebhook(
      user._id.toString(),
      createDto,
    );

    return {
      success: true,
      data: webhook,
      message: 'Webhook created successfully. Save the secret - it will only be shown once!',
    };
  }

  /**
   * List all webhooks
   */
  @Get()
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async listWebhooks(
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; data: WebhookResponse[] }> {
    const webhooks = await this.webhooksService.listWebhooks(user._id.toString());

    return {
      success: true,
      data: webhooks,
    };
  }

  /**
   * Get a single webhook
   */
  @Get(':webhookId')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async getWebhook(
    @CurrentUser() user: any,
    @Param('webhookId') webhookId: string,
  ): Promise<{ success: boolean; data: WebhookResponse }> {
    const webhook = await this.webhooksService.getWebhook(user._id.toString(), webhookId);

    return {
      success: true,
      data: webhook,
    };
  }

  /**
   * Update a webhook
   */
  @Put(':webhookId')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async updateWebhook(
    @CurrentUser() user: any,
    @Param('webhookId') webhookId: string,
    @Body() updateDto: Partial<CreateWebhookDto>,
  ): Promise<{ success: boolean; data: WebhookResponse }> {
    this.logger.log(`Updating webhook ${webhookId} for user ${user._id}`);

    const webhook = await this.webhooksService.updateWebhook(
      user._id.toString(),
      webhookId,
      updateDto,
    );

    return {
      success: true,
      data: webhook,
    };
  }

  /**
   * Delete a webhook
   */
  @Delete(':webhookId')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async deleteWebhook(
    @CurrentUser() user: any,
    @Param('webhookId') webhookId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deleting webhook ${webhookId} for user ${user._id}`);

    await this.webhooksService.deleteWebhook(user._id.toString(), webhookId);

    return {
      success: true,
      message: 'Webhook deleted successfully',
    };
  }

  /**
   * Toggle webhook active status
   */
  @Patch(':webhookId/toggle')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async toggleWebhook(
    @CurrentUser() user: any,
    @Param('webhookId') webhookId: string,
    @Body('isActive') isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Toggling webhook ${webhookId} to ${isActive} for user ${user._id}`);

    await this.webhooksService.toggleWebhook(user._id.toString(), webhookId, isActive);

    return {
      success: true,
      message: `Webhook ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  /**
   * Regenerate webhook secret
   */
  @Post(':webhookId/regenerate-secret')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async regenerateSecret(
    @CurrentUser() user: any,
    @Param('webhookId') webhookId: string,
  ): Promise<{ success: boolean; data: { secret: string }; message: string }> {
    this.logger.log(`Regenerating secret for webhook ${webhookId} for user ${user._id}`);

    const result = await this.webhooksService.regenerateSecret(user._id.toString(), webhookId);

    return {
      success: true,
      data: result,
      message: 'Webhook secret regenerated. Save it - it will only be shown once!',
    };
  }

  /**
   * Get available webhook events
   */
  @Get('events/list')
  @RequireFeature(Feature.API_ACCESS)
  @UseGuards(FeatureGuard)
  async listEvents(): Promise<{ success: boolean; data: string[] }> {
    return {
      success: true,
      data: Object.values(WebhookEvent),
    };
  }
}

