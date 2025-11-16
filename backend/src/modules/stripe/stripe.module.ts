import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './webhook.controller';
import { StripeConnectController } from './connect.controller';
import { StripeConnectWebhookController } from './connect-webhook.controller';
import { StripeService } from './stripe.service';
import { StripeConnectService } from './connect.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [
    StripeController,
    StripeWebhookController,
    StripeConnectController,
    StripeConnectWebhookController,
  ],
  providers: [StripeService, StripeConnectService],
  exports: [StripeService, StripeConnectService],
})
export class StripeModule {}

