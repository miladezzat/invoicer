import { Prop } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

/**
 * Base schema class that other schemas can extend from
 * Provides common fields like _id
 */
export class BaseSchema {
  _id?: MongooseSchema.Types.ObjectId;
}

