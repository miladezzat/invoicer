import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicesSchedulerService } from './invoices-scheduler.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChangeLogsService } from '../change-logs/change-logs.service';
import { Feature } from '../../config/features.config';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly changeLogsService: ChangeLogsService,
    private readonly schedulerService: InvoicesSchedulerService,
  ) {}

  @Post()
  @RequireFeature(Feature.SAVE_INVOICE)
  @UseGuards(FeatureGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: Request,
  ) {
    const invoice = await this.invoicesService.create(user._id, createInvoiceDto);
    
    // Log with request metadata (IP, browser)
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: String(invoice._id),
      operation: 'create',
      changeContext: `Invoice ${invoice.number} created via API`,
      newData: invoice.toObject(),
      userId: user._id,
      source: 'api',
      clientIp: req.ip,
      clientBrowser: req.headers['user-agent'],
    });

    return invoice;
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.invoicesService.findAll(user._id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.findOne(id, user._id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, user._id, updateInvoiceDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.delete(id, user._id);
  }

  @Post(':id/public-link')
  async enablePublicLink(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.invoicesService.enablePublicLink(id, user._id);
    
    // Log enabling public link
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: id,
      operation: 'patch',
      changeContext: 'Public link enabled',
      oldData: { publicEnabled: false },
      newData: { publicEnabled: true, token: result.token },
      userId: user._id,
      source: 'user',
    });

    return result;
  }

  /**
   * Get change history for a specific invoice
   */
  @Get(':id/history')
  async getHistory(@CurrentUser() user: any, @Param('id') id: string) {
    // Verify user has access to this invoice
    await this.invoicesService.findOne(id, user._id);
    
    // Return change history
    return this.changeLogsService.findByDocument('invoices', id);
  }

  /**
   * Enable payment on an invoice
   * Creates Stripe checkout session
   */
  @Post(':id/enable-payment')
  @RequireFeature(Feature.PAYMENT_INTEGRATION)
  @UseGuards(FeatureGuard)
  async enablePayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const { sessionId, paymentUrl } = await this.invoicesService.enablePayment(
      id,
      user._id.toString(),
    );

    return {
      sessionId,
      paymentUrl,
      message: 'Payment enabled successfully',
    };
  }

  /**
   * Manually trigger overdue invoices check (for testing)
   * Checks all invoices and marks overdue ones, triggering webhooks
   */
  @Post('check-overdue')
  async checkOverdue(@CurrentUser() user: any) {
    const result = await this.schedulerService.manualCheckOverdue();
    return {
      success: true,
      ...result,
      message: `Checked ${result.checked} invoices, marked ${result.markedOverdue} as overdue`,
    };
  }

  /**
   * Send invoice via email with PDF attachment
   */
  @Post(':id/send-email')
  async sendInvoiceEmail(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendEmailDto,
  ) {
    await this.invoicesService.sendInvoiceEmail(id, user._id, dto.email);
    return { 
      success: true, 
      message: 'Invoice sent successfully' 
    };
  }

  /**
   * Duplicate an existing invoice
   */
  @Post(':id/duplicate')
  async duplicateInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.invoicesService.duplicateInvoice(id, user._id);
  }
}
