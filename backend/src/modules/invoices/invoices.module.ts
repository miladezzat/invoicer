import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesSchedulerService } from './invoices-scheduler.service';
import { EmailModule } from '../email/email.module';
import { ChangeLogsModule } from '../change-logs/change-logs.module';
import { StripeModule } from '../stripe/stripe.module';
import { ClientsModule } from '../clients/clients.module';
import { DeveloperModule } from '../developer/developer.module';
import { PdfModule } from '../pdf/pdf.module';
import { ProPlanGuard } from '../auth/guards/pro-plan.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Client.name, schema: ClientSchema },
    ]),
    EmailModule,
    ChangeLogsModule,
    StripeModule,
    ClientsModule,
    DeveloperModule, // For WebhooksService
    forwardRef(() => PdfModule), // Avoid circular dependency
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesSchedulerService, ProPlanGuard],
  exports: [InvoicesService, InvoicesSchedulerService],
})
export class InvoicesModule {}

