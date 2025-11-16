import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiAnalyticsService } from './api-analytics.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ApiKey, ApiKeySchema } from '../../schemas/api-key.schema';
import { ApiAnalytics, ApiAnalyticsSchema } from '../../schemas/api-analytics.schema';
import { Webhook, WebhookSchema } from '../../schemas/webhook.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiKey.name, schema: ApiKeySchema },
      { name: ApiAnalytics.name, schema: ApiAnalyticsSchema },
      { name: Webhook.name, schema: WebhookSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ApiKeysController, WebhooksController],
  providers: [ApiKeysService, ApiAnalyticsService, WebhooksService],
  exports: [ApiKeysService, ApiAnalyticsService, WebhooksService],
})
export class DeveloperModule {}

