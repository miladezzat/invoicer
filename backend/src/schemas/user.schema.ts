import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    type: {
      tier: { type: String, enum: ['free', 'pro'], default: 'free' },
      seats: { type: Number, default: 1 },
    },
    default: { tier: 'free', seats: 1 },
  })
  plan: {
    tier: 'free' | 'pro';
    seats: number;
  };

  @Prop({
    type: {
      customerId: String,
      subscriptionId: String,
      status: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'],
      },
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: Boolean,
      priceId: String,
      interval: { type: String, enum: ['month', 'year'] },
    },
  })
  subscription?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    priceId?: string;
    interval?: 'month' | 'year';
  };

  @Prop({
    type: {
      accountId: String,
      accountType: { type: String, enum: ['express', 'standard', 'custom'] },
      accountStatus: { 
        type: String, 
        enum: ['pending', 'active', 'restricted', 'disabled'] 
      },
      connected: { type: Boolean, default: true },
      onboardingComplete: { type: Boolean, default: false },
      chargesEnabled: { type: Boolean, default: false },
      payoutsEnabled: { type: Boolean, default: false },
      detailsSubmitted: { type: Boolean, default: false },
      connectedAt: Date,
      disconnectedAt: Date,
      country: String,
      defaultCurrency: String,
    },
  })
  stripeConnect?: {
    accountId?: string;
    accountType?: 'express' | 'standard' | 'custom';
    accountStatus?: 'pending' | 'active' | 'restricted' | 'disabled';
    connected?: boolean;
    onboardingComplete?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    connectedAt?: Date;
    disconnectedAt?: Date;
    country?: string;
    defaultCurrency?: string;
  };

  @Prop({
    type: {
      currency: { type: String, default: 'USD' },
      locale: { type: String, default: 'en-US' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      taxId: String,
      company: String,
      address: String,
    },
    default: {
      currency: 'USD',
      locale: 'en-US',
      dateFormat: 'YYYY-MM-DD',
    },
  })
  settings: {
    currency: string;
    locale: string;
    dateFormat: string;
    taxId?: string;
    company?: string;
    address?: string;
  };

  @Prop({ default: 0 })
  failedLoginAttempts?: number;

  @Prop()
  accountLockedUntil?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

