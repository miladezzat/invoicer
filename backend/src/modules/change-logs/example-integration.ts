/**
 * EXAMPLE: How to integrate ChangeLogsService into InvoicesModule
 * 
 * This file shows example code for integrating change logs.
 * DO NOT import this file - copy the patterns into your actual services.
 */

// ============================================
// 1. Update invoices.module.ts
// ============================================

/*
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { EmailModule } from '../email/email.module';
import { ChangeLogsModule } from '../change-logs/change-logs.module'; // Add this

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
    EmailModule,
    ChangeLogsModule, // Add this
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
*/

// ============================================
// 2. Update invoices.service.ts
// ============================================

/*
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { ChangeLogsService } from '../change-logs/change-logs.service'; // Add this

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private changeLogsService: ChangeLogsService, // Add this
  ) {}

  // Example: Log invoice creation
  async create(userId: string | null, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.create({
      ...createInvoiceDto,
      userId: userId ? new Types.ObjectId(userId) : undefined,
    });

    // Log the creation
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: invoice._id,
      operation: 'create',
      changeContext: `Invoice ${invoice.number} Created`,
      newData: invoice.toObject(),
      userId: userId || null,
      source: userId ? 'user' : 'guest',
      guestId: !userId ? invoice.guestId : undefined,
    });

    return invoice;
  }

  // Example: Log invoice update
  async update(
    id: string,
    userId: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceDocument> {
    const oldInvoice = await this.invoiceModel.findById(id);
    if (!oldInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      updateInvoiceDto,
      { new: true },
    );

    // Log the update with diff
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: id,
      operation: 'update',
      changeContext: `Invoice ${updatedInvoice.number} Updated`,
      oldData: oldInvoice.toObject(),
      newData: updatedInvoice.toObject(),
      userId,
      source: 'user',
    });

    return updatedInvoice;
  }

  // Example: Log status change (partial update)
  async updateStatus(id: string, status: string, userId: string) {
    const oldInvoice = await this.invoiceModel.findById(id);
    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: id,
      operation: 'patch',
      changeContext: `Status Changed: ${oldInvoice.status} → ${status}`,
      oldData: { status: oldInvoice.status },
      newData: { status },
      userId,
      source: 'user',
    });

    return updatedInvoice;
  }

  // Example: Log invoice preview generation (even if not saved)
  async generatePreview(
    previewData: any,
    userId?: string,
    guestId?: string,
  ) {
    const preview = {
      ...previewData,
      generatedAt: new Date(),
      isPreview: true,
    };

    // Log even though it's not saved
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: new Types.ObjectId(), // Temporary ID
      operation: 'generate',
      changeContext: 'Invoice Preview Generated',
      newData: preview,
      userId: userId || null,
      guestId,
      source: userId ? 'user' : 'guest',
    });

    return preview;
  }

  // Example: Log invoice deletion
  async remove(id: string, userId: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(id);
    
    await this.invoiceModel.findByIdAndUpdate(id, { isDeleted: true });

    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: id,
      operation: 'delete',
      changeContext: `Invoice ${invoice.number} Deleted`,
      oldData: invoice.toObject(),
      newData: { isDeleted: true },
      userId,
      source: 'user',
    });
  }
}
*/

// ============================================
// 3. Update invoices.controller.ts (for request context)
// ============================================

/*
import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Example: Passing request context for IP and browser logging
  @Post()
  async create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: Request) {
    const invoice = await this.invoicesService.create(req.user.userId, createInvoiceDto);
    
    // You can also log directly in the controller for more context
    await this.changeLogsService.logChange({
      collectionName: 'invoices',
      documentId: invoice._id,
      operation: 'create',
      changeContext: `Invoice Created via API`,
      newData: invoice.toObject(),
      userId: req.user.userId,
      source: 'api',
      clientIp: req.ip,
      clientBrowser: req.headers['user-agent'],
    });

    return invoice;
  }
}
*/

// ============================================
// 4. Querying Change Logs
// ============================================

/*
// Get all changes for a specific invoice
const invoiceChanges = await this.changeLogsService.findByDocument(
  'invoices',
  invoiceId,
);

// Get all changes by a user
const userActivity = await this.changeLogsService.findByUser(userId);

// Get statistics
const stats = await this.changeLogsService.getStatistics(userId);

// Advanced query
const result = await this.changeLogsService.findAll({
  collectionName: 'invoices',
  operation: 'generate',
  source: 'guest',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  page: 1,
  limit: 50,
});
*/

