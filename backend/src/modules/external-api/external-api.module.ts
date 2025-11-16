import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalApiController } from './external-api.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DeveloperModule } from '../developer/developer.module';
import { ApiKey, ApiKeySchema } from '../../schemas/api-key.schema';
import { ApiKeysService } from '../developer/api-keys.service';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiKey.name, schema: ApiKeySchema },
      { name: User.name, schema: UserSchema },
    ]),
    InvoicesModule,
    ClientsModule,
    AnalyticsModule,
    DeveloperModule, // For ApiAnalyticsService
  ],
  controllers: [ExternalApiController],
  providers: [ApiKeysService],
})
export class ExternalApiModule {}

