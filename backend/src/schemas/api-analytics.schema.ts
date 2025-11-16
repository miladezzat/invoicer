import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApiAnalyticsDocument = ApiAnalytics & Document;

@Schema({ timestamps: true })
export class ApiAnalytics {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ApiKey', index: true })
  apiKeyId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  endpoint: string;

  @Prop({ required: true })
  method: string; // GET, POST, PUT, DELETE

  @Prop({ required: true, index: true })
  statusCode: number;

  @Prop()
  responseTime: number; // in milliseconds

  @Prop()
  ip: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  queryParams?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop({ default: false })
  isError: boolean;

  @Prop({ required: true, index: true })
  timestamp: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ApiAnalyticsSchema = SchemaFactory.createForClass(ApiAnalytics);

// Indexes for efficient queries
ApiAnalyticsSchema.index({ userId: 1, timestamp: -1 });
ApiAnalyticsSchema.index({ userId: 1, endpoint: 1, timestamp: -1 });
ApiAnalyticsSchema.index({ apiKeyId: 1, timestamp: -1 });
ApiAnalyticsSchema.index({ timestamp: -1 });

// TTL index - automatically delete records older than 90 days
ApiAnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days


