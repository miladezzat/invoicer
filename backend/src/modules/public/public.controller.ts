import { Controller, Get, Param, Post } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service';

@Controller('public')
export class PublicController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('invoices/:token')
  async getPublicInvoice(@Param('token') token: string) {
    const { invoice, user } = await this.invoicesService.findByPublicTokenWithUser(token);
    
    // Return only public-safe data
    return {
      invoice: {
        _id: String(invoice._id),
        number: invoice.number,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        paymentTerms: invoice.paymentTerms,
        lineItems: invoice.lineItems,
        subtotal: invoice.subtotal,
        taxPercent: invoice.taxPercent,
        taxAmount: invoice.taxAmount,
        discountFlat: invoice.discountFlat,
        total: invoice.total,
        balanceDue: invoice.balanceDue,
        notes: invoice.notes,
        terms: invoice.terms,
        freelancerName: invoice.freelancerName,
        freelancerEmail: invoice.freelancerEmail,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientCompany: invoice.clientCompany,
        clientAddress: invoice.clientAddress,
        brandColor: invoice.brandColor,
        payment: invoice.payment ? {
          enabled: invoice.payment.enabled,
          status: invoice.payment.status,
          paidAt: invoice.payment.paidAt,
          receiptUrl: invoice.payment.receiptUrl,
        } : undefined,
        // Include user's plan tier to check if payment is allowed
        userPlanTier: user?.plan?.tier || 'free',
      },
    };
  }

  @Post('invoices/:id/payment-session')
  async createPaymentSession(@Param('id') id: string) {
    const { url } = await this.invoicesService.createPublicPaymentSession(id);
    return { url };
  }
}

