import { IsString, IsNotEmpty, IsObject, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateChangeLogDto {
  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @IsMongoId()
  @IsNotEmpty()
  documentId: Types.ObjectId | string;

  @IsString()
  @IsNotEmpty()
  changeContext: string;

  @IsObject()
  @IsNotEmpty()
  changes: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  rawChanges: Record<string, any>;

  @IsObject()
  @IsOptional()
  snapshot?: Record<string, any>;

  @IsEnum(['create', 'update', 'delete', 'patch', 'generate', 'view'])
  @IsNotEmpty()
  operation: string;

  @IsMongoId()
  @IsOptional()
  userId?: Types.ObjectId | string | null;

  @IsString()
  @IsOptional()
  modifierName?: string;

  @IsEnum(['user', 'integration', 'system', 'api', 'guest'])
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsOptional()
  externalSystem?: string | null;

  @IsString()
  @IsOptional()
  clientIp?: string;

  @IsString()
  @IsOptional()
  clientBrowser?: string;

  @IsString()
  @IsOptional()
  guestId?: string;
}

