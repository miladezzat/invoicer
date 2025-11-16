import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { WebhooksService } from '../developer/webhooks.service';
import { WebhookEvent } from '../../schemas/webhook.schema';

/**
 * Scheduler service for invoice-related cron jobs
 * Handles periodic checks like overdue invoices
 */
@Injectable()
export class InvoicesSchedulerService {
  private readonly logger = new Logger(InvoicesSchedulerService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private webhooksService: WebhooksService,
  ) {}

  /**
   * Check for overdue invoices and trigger webhooks
   * Runs daily at 9 AM
   * 
   * To enable this, you need to:
   * 1. Install @nestjs/schedule: npm install @nestjs/schedule
   * 2. Import ScheduleModule in AppModule
   * 3. Uncomment the @Cron decorator below
   */
  // Uncomment when @nestjs/schedule is installed:
  // @Cron('0 9 * * *') // Every day at 9 AM
  async checkOverdueInvoices(): Promise<void> {
    this.logger.log('Running overdue invoices check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      // Find invoices that are:
      // 1. Not deleted
      // 2. Not paid
      // 3. Due date is before today
      // 4. Not already marked as overdue (optional - you can remove this to trigger daily)
      const overdueInvoices = await this.invoiceModel
        .find({
          isDeleted: false,
          status: { $nin: ['paid', 'overdue'] }, // Not paid and not already marked overdue
          dueDate: { $lt: today.toISOString().split('T')[0] },
          userId: { $exists: true },
        })
        .exec();

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

      // Update status and trigger webhooks
      for (const invoice of overdueInvoices) {
        if (!invoice.dueDate) continue; // Skip if no due date
        
        // Update invoice status to overdue
        invoice.status = 'overdue';
        invoice.activity.push({
          at: new Date(),
          type: 'overdue',
          meta: {
            dueDate: invoice.dueDate,
            daysOverdue: this.calculateDaysOverdue(invoice.dueDate),
          },
        });

        await invoice.save();

        // Trigger webhook
        if (invoice.userId) {
          this.webhooksService
            .triggerWebhooks(
              invoice.userId.toString(),
              WebhookEvent.INVOICE_OVERDUE,
              {
                ...invoice.toObject(),
                daysOverdue: this.calculateDaysOverdue(invoice.dueDate),
              },
            )
            .catch((err) =>
              this.logger.error(
                `Failed to trigger overdue webhook for invoice ${invoice._id}:`,
                err,
              ),
            );
        }

        this.logger.log(
          `Invoice ${invoice.number} marked as overdue (${this.calculateDaysOverdue(invoice.dueDate)} days)`,
        );
      }

      this.logger.log('Overdue invoices check completed');
    } catch (error) {
      this.logger.error('Error checking overdue invoices:', error);
    }
  }

  /**
   * Calculate how many days an invoice is overdue
   */
  private calculateDaysOverdue(dueDate: string | Date): number {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Manual trigger for testing (can be called via API endpoint)
   */
  async manualCheckOverdue(): Promise<{ 
    checked: number; 
    markedOverdue: number;
    invoices: string[];
  }> {
    this.logger.log('Manual overdue check triggered');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.invoiceModel
      .find({
        isDeleted: false,
        status: { $nin: ['paid', 'overdue'] },
        dueDate: { $lt: today.toISOString().split('T')[0] },
        userId: { $exists: true },
      })
      .exec();

    const invoiceNumbers: string[] = [];

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue; // Skip if no due date
      
      invoice.status = 'overdue';
      invoice.activity.push({
        at: new Date(),
        type: 'overdue',
        meta: {
          dueDate: invoice.dueDate,
          daysOverdue: this.calculateDaysOverdue(invoice.dueDate),
        },
      });

      await invoice.save();
      invoiceNumbers.push(invoice.number);

      if (invoice.userId) {
        this.webhooksService
          .triggerWebhooks(
            invoice.userId.toString(),
            WebhookEvent.INVOICE_OVERDUE,
            {
              ...invoice.toObject(),
              daysOverdue: this.calculateDaysOverdue(invoice.dueDate),
            },
          )
          .catch((err) =>
            this.logger.error('Failed to trigger overdue webhook:', err),
          );
      }
    }

    return {
      checked: await this.invoiceModel.countDocuments({
        isDeleted: false,
        status: { $ne: 'paid' },
        userId: { $exists: true },
      }),
      markedOverdue: overdueInvoices.length,
      invoices: invoiceNumbers,
    };
  }
}

