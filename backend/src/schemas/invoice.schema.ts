import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ _id: false })
export class LineItem {
  @Prop({ required: true })
  description: string;

  @Prop()
  periodFrom?: Date;

  @Prop()
  periodTo?: Date;

  @Prop()
  days?: number;

  @Prop()
  hoursPerDay?: number;

  @Prop({ required: true })
  totalHours: number;

  @Prop({ required: true })
  hourlyRate: number;

  @Prop({ required: true })
  amount: number;
}

@Schema({ _id: false })
export class ActivityLog {
  @Prop({ required: true })
  at: Date;

  @Prop({ required: true, enum: ['created', 'sent', 'viewed', 'paid', 'voided'] })
  type: string;

  @Prop({ type: Object })
  meta?: any;
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client' })
  clientId?: Types.ObjectId;

  // Freelancer/From information
  @Prop()
  freelancerName?: string;

  @Prop()
  freelancerEmail?: string;

  @Prop()
  freelancerAddress?: string;

  // Client/Bill To information
  @Prop()
  clientName?: string;

  @Prop()
  clientEmail?: string;

  @Prop()
  clientCompany?: string;

  @Prop()
  clientAddress?: string;

  @Prop()
  paymentTerms?: string;

  @Prop()
  brandColor?: string;

  @Prop({ required: true })
  number: string;

  @Prop()
  manualInvoiceNumber?: string;

  @Prop({ required: true })
  sequence: number;

  @Prop({ required: true })
  year: number;

  @Prop({
    required: true,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void'],
    default: 'draft',
    index: true,
  })
  status: string;

  @Prop({ required: true })
  issueDate: Date;

  @Prop()
  dueDate?: Date;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ type: [LineItem], required: true })
  lineItems: LineItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  taxPercent: number;

  @Prop({ default: 0 })
  taxAmount: number;

  @Prop({ default: 0 })
  discountFlat: number;

  @Prop({ required: true })
  total: number;

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ required: true })
  balanceDue: number;

  @Prop()
  notes?: string;

  @Prop()
  terms?: string;

  @Prop({ type: Types.ObjectId, ref: 'Template' })
  templateId?: Types.ObjectId;

  @Prop({
    type: {
      token: { type: String, unique: true, sparse: true },
      enabled: { type: Boolean, default: false },
      viewedAt: Date,
      pdfUrl: String,
    },
  })
  public?: {
    token: string;
    enabled: boolean;
    viewedAt?: Date;
    pdfUrl?: string;
  };

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      stripeCheckoutSessionId: String,
      stripePaymentIntentId: String,
      status: { 
        type: String, 
        enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
        default: 'unpaid'
      },
      paidAt: Date,
      paidAmount: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      stripeFee: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 },
      paymentMethod: String,
      refundedAt: Date,
      refundAmount: { type: Number, default: 0 },
      failureReason: String,
      receiptUrl: String,
    },
  })
  payment?: {
    enabled?: boolean;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    status?: 'unpaid' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    paidAt?: Date;
    paidAmount?: number;
    platformFee?: number;
    stripeFee?: number;
    netAmount?: number;
    paymentMethod?: string;
    refundedAt?: Date;
    refundAmount?: number;
    failureReason?: string;
    receiptUrl?: string;
  };

  @Prop({ type: [ActivityLog], default: [] })
  activity: ActivityLog[];

  @Prop({ default: false })
  isDeleted: boolean;

  // For guest invoices (userId is null)
  @Prop()
  guestId?: string;

  // Email tracking
  @Prop()
  sentAt?: Date;

  @Prop()
  emailSentTo?: string;

  @Prop({ default: 0 })
  emailSentCount: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes
InvoiceSchema.index({ userId: 1, status: 1, isDeleted: 1 });
InvoiceSchema.index({ userId: 1, year: 1, sequence: 1 });
InvoiceSchema.index({ userId: 1, number: 1 }, { unique: true, sparse: true }); // Unique invoice number per user
InvoiceSchema.index({ 'public.token': 1 });
InvoiceSchema.index({ guestId: 1 });

