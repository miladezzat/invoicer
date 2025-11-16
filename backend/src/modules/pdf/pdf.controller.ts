import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { InvoicesService } from '../invoices/invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  async generateInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    // Fetch invoice
    const invoice = await this.invoicesService.findOne(id, user._id.toString());

    // Generate HTML
    const html = this.pdfService.generateInvoiceHtml(invoice);

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateInvoicePdf(html);

    // Send PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('public/:token')
  async generatePublicInvoicePdf(@Param('token') token: string, @Res() res: Response) {
    // Fetch public invoice
    const invoice = await this.invoicesService.findByPublicToken(token);

    // Generate HTML
    const html = this.pdfService.generateInvoiceHtml(invoice);

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateInvoicePdf(html);

    // Send PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}

