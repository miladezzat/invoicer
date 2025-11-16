import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TemplateDocument = Template & Document;

@Schema({ timestamps: true })
export class Template {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['minimal', 'classic', 'modern'], default: 'minimal' })
  theme: string;

  @Prop({
    type: {
      logoUrl: String,
      colorPrimary: String,
      colorText: String,
      headerLayout: String,
    },
  })
  brand?: {
    logoUrl?: string;
    colorPrimary?: string;
    colorText?: string;
    headerLayout?: string;
  };

  @Prop({
    type: {
      showTaxId: { type: Boolean, default: true },
      showDiscount: { type: Boolean, default: true },
      notesDefault: String,
      termsDefault: String,
    },
    default: {
      showTaxId: true,
      showDiscount: true,
    },
  })
  fields: {
    showTaxId: boolean;
    showDiscount: boolean;
    notesDefault?: string;
    termsDefault?: string;
  };

  @Prop({
    type: {
      size: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
      margin: { type: Number, default: 24 },
    },
    default: {
      size: 'A4',
      margin: 24,
    },
  })
  paper: {
    size: 'A4' | 'Letter';
    margin: number;
  };

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

// Indexes
TemplateSchema.index({ userId: 1, isDeleted: 1 });

