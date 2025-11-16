import { IsNotEmpty, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(['minimal', 'classic', 'modern'])
  theme: string;

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

