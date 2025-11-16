import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import axios from 'axios';
import { Webhook, WebhookDocument, WebhookEvent, WebhookAttempt } from '../../schemas/webhook.schema';

export interface CreateWebhookDto {
  url: string;
  description?: string;
  events: WebhookEvent[];
  secret?: string;
}

export interface WebhookResponse {
  id: string;
  url: string;
  description?: string;
  events: WebhookEvent[];
  isActive: boolean;
  secret?: string; // Only returned on creation
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  recentAttempts?: WebhookAttempt[];
  createdAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectModel(Webhook.name) private webhookModel: Model<WebhookDocument>,
  ) {}

  /**
   * Create a new webhook
   */
  async createWebhook(
    userId: string,
    createDto: CreateWebhookDto,
  ): Promise<WebhookResponse> {
    const secret = createDto.secret || crypto.randomBytes(32).toString('hex');

    const webhook = new this.webhookModel({
      userId: new Types.ObjectId(userId),
      url: createDto.url,
      description: createDto.description,
      events: createDto.events,
      secret,
      isActive: true,
      successCount: 0,
      failureCount: 0,
      recentAttempts: [],
    });

    await webhook.save();

    this.logger.log(`Created webhook for user ${userId}: ${webhook.url}`);

    // Return response with secret (only shown on creation)
    return this.toResponse(webhook, true);
  }

  /**
   * List all webhooks for a user
   */
  async listWebhooks(userId: string): Promise<WebhookResponse[]> {
    const webhooks = await this.webhookModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return webhooks.map((webhook) => this.toResponse(webhook));
  }

  /**
   * Get a single webhook with details
   */
  async getWebhook(userId: string, webhookId: string): Promise<WebhookResponse> {
    const webhook = await this.webhookModel
      .findOne({
        _id: new Types.ObjectId(webhookId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Include recent attempts in details view
    return this.toResponse(webhook, false, true);
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    userId: string,
    webhookId: string,
    updateDto: Partial<CreateWebhookDto>,
  ): Promise<WebhookResponse> {
    const webhook = await this.webhookModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(webhookId),
          userId: new Types.ObjectId(userId),
        },
        { $set: updateDto },
        { new: true },
      )
      .exec();

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Updated webhook ${webhookId} for user ${userId}`);

    return this.toResponse(webhook);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    const result = await this.webhookModel
      .deleteOne({
        _id: new Types.ObjectId(webhookId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Deleted webhook ${webhookId} for user ${userId}`);
  }

  /**
   * Toggle webhook active status
   */
  async toggleWebhook(userId: string, webhookId: string, isActive: boolean): Promise<void> {
    const result = await this.webhookModel
      .updateOne(
        {
          _id: new Types.ObjectId(webhookId),
          userId: new Types.ObjectId(userId),
        },
        { $set: { isActive } },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Toggled webhook ${webhookId} to ${isActive} for user ${userId}`);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(userId: string, webhookId: string): Promise<{ secret: string }> {
    const newSecret = crypto.randomBytes(32).toString('hex');

    const webhook = await this.webhookModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(webhookId),
          userId: new Types.ObjectId(userId),
        },
        { $set: { secret: newSecret } },
        { new: true },
      )
      .exec();

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    this.logger.log(`Regenerated secret for webhook ${webhookId}`);

    return { secret: newSecret };
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(userId: string, event: WebhookEvent, payload: any): Promise<void> {
    const webhooks = await this.webhookModel
      .find({
        userId: new Types.ObjectId(userId),
        events: event,
        isActive: true,
      })
      .exec();

    if (webhooks.length === 0) {
      return;
    }

    this.logger.log(`Triggering ${webhooks.length} webhooks for event ${event}`);

    // Trigger all webhooks in parallel
    const promises = webhooks.map((webhook) =>
      this.sendWebhook(webhook, event, payload),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(
    webhook: WebhookDocument,
    event: WebhookEvent,
    payload: any,
  ): Promise<void> {
    const startTime = Date.now();
    const attempt: WebhookAttempt = {
      timestamp: new Date(),
      success: false,
    };

    try {
      // Create signature
      const signature = this.createSignature(webhook.secret!, payload);

      // Send request
      const response = await axios.post(webhook.url, {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          ...webhook.headers,
        },
        timeout: 10000, // 10 seconds
      });

      // Success
      attempt.success = true;
      attempt.statusCode = response.status;
      attempt.response = JSON.stringify(response.data).substring(0, 500);
      attempt.duration = Date.now() - startTime;

      await this.webhookModel.updateOne(
        { _id: webhook._id },
        {
          $set: {
            lastTriggeredAt: new Date(),
            lastSuccessAt: new Date(),
          },
          $inc: { successCount: 1 },
          $push: {
            recentAttempts: {
              $each: [attempt],
              $slice: -10, // Keep last 10 attempts
            },
          },
        },
      ).exec();

      this.logger.log(`Webhook ${webhook._id} delivered successfully to ${webhook.url}`);
    } catch (error: any) {
      // Failure
      attempt.success = false;
      attempt.statusCode = error.response?.status;
      attempt.error = error.message;
      attempt.duration = Date.now() - startTime;

      await this.webhookModel.updateOne(
        { _id: webhook._id },
        {
          $set: {
            lastTriggeredAt: new Date(),
            lastFailureAt: new Date(),
          },
          $inc: { failureCount: 1 },
          $push: {
            recentAttempts: {
              $each: [attempt],
              $slice: -10,
            },
          },
        },
      ).exec();

      this.logger.error(`Webhook ${webhook._id} failed: ${error.message}`);
    }
  }

  /**
   * Create HMAC signature for webhook payload
   */
  private createSignature(secret: string, payload: any): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Convert webhook document to response
   */
  private toResponse(
    webhook: WebhookDocument, 
    includeSecret = false,
    includeAttempts = false,
  ): WebhookResponse {
    const response: WebhookResponse = {
      id: (webhook._id as any).toString(),
      url: webhook.url,
      description: webhook.description,
      events: webhook.events,
      isActive: webhook.isActive,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      lastTriggeredAt: webhook.lastTriggeredAt,
      lastSuccessAt: webhook.lastSuccessAt,
      lastFailureAt: webhook.lastFailureAt,
      createdAt: webhook.createdAt!,
    };

    // Only include secret on creation
    if (includeSecret && webhook.secret) {
      response.secret = webhook.secret;
    }

    // Include recent attempts for detail view
    if (includeAttempts && webhook.recentAttempts) {
      response.recentAttempts = webhook.recentAttempts;
    }

    return response;
  }
}

