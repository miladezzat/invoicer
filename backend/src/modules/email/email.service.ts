import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured. Email sending will be disabled.');
    }
  }

  async sendInvoice(
    to: string,
    invoiceData: {
      number: string;
      total: number;
      currency: string;
      publicUrl?: string;
      pdfUrl?: string;
    },
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping email send.');
      return;
    }

    try {
      await this.resend.emails.send({
        from: 'Invoice Builder <invoices@yourdomain.com>',
        to: [to],
        subject: `Invoice ${invoiceData.number}`,
        html: this.generateInvoiceEmailHtml(invoiceData),
      });

      this.logger.log(`Invoice email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invoice email to ${to}`, error);
      throw error;
    }
  }

  async sendInvoiceReminder(
    to: string,
    invoiceData: {
      number: string;
      total: number;
      currency: string;
      dueDate: Date;
      publicUrl?: string;
    },
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping email send.');
      return;
    }

    try {
      await this.resend.emails.send({
        from: 'Invoice Builder <invoices@yourdomain.com>',
        to: [to],
        subject: `Reminder: Invoice ${invoiceData.number} Due Soon`,
        html: this.generateReminderEmailHtml(invoiceData),
      });

      this.logger.log(`Reminder email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${to}`, error);
      throw error;
    }
  }

  private generateInvoiceEmailHtml(invoiceData: {
    number: string;
    total: number;
    currency: string;
    publicUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice ${invoiceData.number}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have received a new invoice for <strong>${invoiceData.currency} ${invoiceData.total.toFixed(2)}</strong>.</p>
            ${
              invoiceData.publicUrl
                ? `
              <p>
                <a href="${invoiceData.publicUrl}" class="button">View Invoice</a>
              </p>
            `
                : ''
            }
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>Sent via Invoice Builder</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateReminderEmailHtml(invoiceData: {
    number: string;
    total: number;
    currency: string;
    dueDate: Date;
    publicUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #dc2626;
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>This is a friendly reminder that invoice <strong>${invoiceData.number}</strong> for <strong>${invoiceData.currency} ${invoiceData.total.toFixed(2)}</strong> is due on <strong>${invoiceData.dueDate.toLocaleDateString()}</strong>.</p>
            ${
              invoiceData.publicUrl
                ? `
              <p>
                <a href="${invoiceData.publicUrl}" class="button">View Invoice</a>
              </p>
            `
                : ''
            }
            <p>If you have already made the payment, please disregard this message.</p>
            <p>Thank you!</p>
          </div>
          <div class="footer">
            <p>Sent via Invoice Builder</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(params: {
    to: string;
    clientName: string;
    freelancerName: string;
    invoiceNumber: string;
    dueDate: string;
    total: string;
    currency: string;
    pdfBuffer: Buffer;
    pdfFilename: string;
    period?: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping email send.');
      return;
    }

    try {
      const subject = params.period 
        ? `Invoice ${params.invoiceNumber} | ${params.period}`
        : `Invoice ${params.invoiceNumber}`;

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #2563eb;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .info-row {
                margin: 8px 0;
                font-size: 14px;
              }
              .info-row strong {
                color: #1f2937;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice ${params.invoiceNumber}</h1>
            </div>
            <div class="content">
              <p>Hi ${params.clientName},</p>
              <p>Please find your invoice attached.</p>
              <div class="info-row"><strong>Invoice #:</strong> ${params.invoiceNumber}</div>
              ${params.period ? `<div class="info-row"><strong>Period:</strong> ${params.period}</div>` : ''}
              <div class="info-row"><strong>Amount Due:</strong> ${params.total} ${params.currency}</div>
              <div class="info-row"><strong>Due Date:</strong> ${params.dueDate}</div>
              <p style="margin-top: 20px;">Thank you!</p>
              <p>${params.freelancerName}</p>
            </div>
            <div class="footer">
              <p>Sent via Invoice Builder</p>
            </div>
          </body>
        </html>
      `;

      await this.resend.emails.send({
        from: 'Invoices <invoices@yourdomain.com>',
        to: [params.to],
        subject: subject,
        html: htmlBody,
        attachments: [{
          filename: params.pdfFilename,
          content: params.pdfBuffer,
        }],
      });

      this.logger.log(`Invoice email sent to ${params.to} with PDF attachment`);
    } catch (error) {
      this.logger.error(`Failed to send invoice email to ${params.to}`, error);
      throw error;
    }
  }
}

