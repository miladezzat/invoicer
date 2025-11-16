import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from './base.schema';

export type ChangeLogDocument = ChangeLog & Document;

/**
 * Mongoose schema for audit/change logging system
 * Tracks all changes to documents across collections for audit trail and compliance
 */
@Schema({ timestamps: true })
export class ChangeLog extends BaseSchema {
  /**
   * Essential Metadata Fields
   */
  
  /** Name of the collection being tracked (e.g., 'invoices', 'clients', 'templates') */
  @Prop({ required: true, index: true })
  collectionName: string;

  /** Reference to the changed document's ObjectId */
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, index: true })
  documentId: MongooseSchema.Types.ObjectId;

  /** Human-readable description of what changed (e.g., "Invoice Status Changed", "Client Email Updated") */
  @Prop({ required: true })
  changeContext: string;

  /**
   * Change Tracking Fields
   */
  
  /** 
   * Diff of changes - stores field-level differences
   * Format: { fieldName: { from: oldValue, to: newValue } }
   * This is automatically calculated when oldData and newData are provided
   */
  @Prop({ required: true, type: Object })
  changes: Record<string, any>;

  /** 
   * Unprocessed/raw changes - stores the complete new data or update payload
   * Useful for detailed inspection and debugging
   */
  @Prop({ required: true, type: Object })
  rawChanges: Record<string, any>;

  /** 
   * Optional full snapshot of the document after the change
   * Useful for point-in-time recovery or viewing complete historical state
   */
  @Prop({ type: Object })
  snapshot?: Record<string, any>;

  /**
   * Operation Details
   */
  
  /** 
   * Type of operation performed
   * - create: New document created
   * - update: Full document update
   * - delete: Document deleted
   * - patch: Partial update (e.g., status change)
   */
  @Prop({ 
    required: true, 
    enum: ['create', 'update', 'delete', 'patch'],
    index: true 
  })
  operation: 'create' | 'update' | 'delete' | 'patch';

  /** ObjectId of the user who made the change (null for system operations) */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId?: MongooseSchema.Types.ObjectId | null;

  /** Cached name of the user who made the change for quick display without populating */
  @Prop()
  modifierName?: string;

  /** 
   * Source of the change
   * - user: Direct user action through UI
   * - integration: External integration (e.g., Stripe webhook)
   * - system: Automated system action (e.g., scheduled job)
   * - api: Direct API call from external service
   */
  @Prop({ 
    required: true, 
    enum: ['user', 'integration', 'system', 'api'],
    index: true 
  })
  source: 'user' | 'integration' | 'system' | 'api';

  /** Name of the external system if source is 'integration' (e.g., 'stripe', 'salesforce') */
  @Prop({type: String})
  externalSystem?: string;

  /**
   * Client Metadata
   */
  
  /** IP address of the client that initiated the change */
  @Prop()
  clientIp?: string;

  /** User agent string of the client browser/application */
  @Prop()
  clientBrowser?: string;
}

// Create the schema
export const ChangeLogSchema = SchemaFactory.createForClass(ChangeLog);

/**
 * Virtual populate for the user who made the change
 * Allows easy access to full user details without storing redundant data
 */
ChangeLogSchema.virtual('changedBy', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  getters: true,
});

/**
 * Indexes for performance optimization
 */

// Compound index for querying logs of a specific document
ChangeLogSchema.index({ collectionName: 1, documentId: 1 });

// Index for user activity queries
ChangeLogSchema.index({ userId: 1, createdAt: -1 });

// Index for filtering by operation type
ChangeLogSchema.index({ operation: 1, createdAt: -1 });

// Index for filtering by source
ChangeLogSchema.index({ source: 1, createdAt: -1 });

// Index for time-based queries
ChangeLogSchema.index({ createdAt: -1 });

/**
 * TTL index for automatic log expiration (optional - currently disabled)
 * Uncomment to automatically delete logs older than 90 days
 */
// ChangeLogSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 90 * 24 * 60 * 60 },
// );

/**
 * Enable virtuals in JSON and object output
 * This allows the 'changedBy' virtual to be included when converting to JSON/Object
 */
ChangeLogSchema.set('toObject', { virtuals: true });
ChangeLogSchema.set('toJSON', { virtuals: true });

