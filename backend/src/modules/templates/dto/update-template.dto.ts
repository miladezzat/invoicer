import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['minimal', 'classic', 'modern'])
  theme?: string;

  @IsOptional()
  @IsObject()
  brand?: {
    logoUrl?: string;
    colorPrimary?: string;
    colorText?: string;
    headerLayout?: string;
  };

  @IsOptional()
  @IsObject()
  fields?: {
    showTaxId?: boolean;
    showDiscount?: boolean;
    notesDefault?: string;
    termsDefault?: string;
  };

  @IsOptional()
  @IsObject()
  paper?: {
    size?: 'A4' | 'Letter';
    margin?: number;
  };
}

