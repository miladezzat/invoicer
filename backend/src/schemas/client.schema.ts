import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['personal', 'company'], default: 'personal' })
  clientType: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  company?: string;

  @Prop()
  taxId?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;

  @Prop()
  notes?: string;

  @Prop({ default: 0 })
  invoiceCounter: number;

  // Total amount of unpaid/outstanding invoices (draft, sent, overdue, etc.)
  @Prop({ default: 0 })
  totalInvoiced: number;

  // Total amount of paid invoices
  @Prop({ default: 0 })
  totalPaid: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Create compound index for user + client name uniqueness
ClientSchema.index({ userId: 1, name: 1 }, { unique: true });
