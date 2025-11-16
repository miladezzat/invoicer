import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import { DeveloperModule } from '../developer/developer.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: User.name, schema: UserSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    DeveloperModule, // Import for WebhooksService
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
