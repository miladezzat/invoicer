import { ApiProperty } from '@nestjs/swagger';

export class LineItemDto {
  @ApiProperty({ description: 'Description of the item or service', example: 'Web Development Services' })
  description: string;

  @ApiProperty({ description: 'Quantity', example: 40 })
  quantity: number;

  @ApiProperty({ description: 'Rate per unit', example: 100 })
  rate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Client ID (if existing client)', required: false, example: '507f1f77bcf86cd799439011' })
  clientId?: string;

  @ApiProperty({ description: 'Client name', example: 'Acme Corporation' })
  clientName: string;

  @ApiProperty({ description: 'Client email', example: 'contact@acme.com' })
  clientEmail: string;

  @ApiProperty({ description: 'Client address', required: false, example: '123 Business St, City, State 12345' })
  clientAddress?: string;

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)', example: '2025-11-02' })
  issueDate: string;

  @ApiProperty({ description: 'Due date (YYYY-MM-DD)', example: '2025-12-02' })
  dueDate: string;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  currency: string;

  @ApiProperty({ type: [LineItemDto], description: 'Line items for the invoice' })
  lineItems: LineItemDto[];

  @ApiProperty({ description: 'Additional notes', required: false, example: 'Thank you for your business!' })
  notes?: string;

  @ApiProperty({ description: 'Tax rate', required: false, example: 0.1 })
  taxRate?: number;

  @ApiProperty({ description: 'Discount amount', required: false, example: 0 })
  discount?: number;
}

export class UpdateInvoiceDto {
  @ApiProperty({ description: 'Invoice status', enum: ['draft', 'sent', 'paid', 'cancelled'], required: false })
  status?: string;

  @ApiProperty({ description: 'Client name', required: false })
  clientName?: string;

  @ApiProperty({ description: 'Client email', required: false })
  clientEmail?: string;

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)', required: false })
  issueDate?: string;

  @ApiProperty({ description: 'Due date (YYYY-MM-DD)', required: false })
  dueDate?: string;

  @ApiProperty({ type: [LineItemDto], description: 'Line items for the invoice', required: false })
  lineItems?: LineItemDto[];

  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'Tax rate', required: false })
  taxRate?: number;

  @ApiProperty({ description: 'Discount amount', required: false })
  discount?: number;
}

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Unique invoice ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ description: 'Invoice number', example: 'INV-001' })
  invoiceNumber: string;

  @ApiProperty({ description: 'Client name', example: 'Acme Corporation' })
  clientName: string;

  @ApiProperty({ description: 'Client email', example: 'contact@acme.com' })
  clientEmail: string;

  @ApiProperty({ description: 'Issue date', example: '2025-11-02T00:00:00.000Z' })
  issueDate: string;

  @ApiProperty({ description: 'Due date', example: '2025-12-02T00:00:00.000Z' })
  dueDate: string;

  @ApiProperty({ description: 'Invoice status', enum: ['draft', 'sent', 'paid', 'cancelled'] })
  status: string;

  @ApiProperty({ description: 'Total amount', example: 4000 })
  total: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ type: [LineItemDto], description: 'Line items' })
  lineItems: LineItemDto[];
}



