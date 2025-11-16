import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebhookDocument = Webhook & Document;

export enum WebhookEvent {
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_DELETED = 'invoice.deleted',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_VIEWED = 'invoice.viewed',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_OVERDUE = 'invoice.overdue',
  
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_FAILED = 'payment.failed',
}

@Schema({ _id: false })
export class WebhookAttempt {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  success: boolean;

  @Prop()
  statusCode?: number;

  @Prop()
  response?: string;

  @Prop()
  error?: string;

  @Prop()
  duration?: number; // milliseconds
}

@Schema({ timestamps: true })
export class Webhook {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  description?: string;

  @Prop({ type: [String], required: true })
  events: WebhookEvent[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  secret?: string;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failureCount: number;

  @Prop()
  lastTriggeredAt?: Date;

  @Prop()
  lastSuccessAt?: Date;

  @Prop()
  lastFailureAt?: Date;

  @Prop({ type: [WebhookAttempt], default: [] })
  recentAttempts: WebhookAttempt[];

  @Prop({ type: Object, default: {} })
  headers?: Record<string, string>;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);

// Indexes
WebhookSchema.index({ userId: 1, isActive: 1 });
WebhookSchema.index({ events: 1 });

