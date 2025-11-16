import { IsString, IsOptional, IsEnum, IsMongoId, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryChangeLogDto {
  @IsOptional()
  @IsString()
  collectionName?: string;

  @IsOptional()
  @IsMongoId()
  documentId?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(['create', 'update', 'delete', 'patch', 'generate', 'view'])
  operation?: string;

  @IsOptional()
  @IsEnum(['user', 'integration', 'system', 'api', 'guest'])
  source?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}

