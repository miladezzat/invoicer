import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'Client email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: 'Company name', required: false, example: 'Acme Corporation' })
  company?: string;

  @ApiProperty({ description: 'Client address', required: false, example: '123 Business St, City, State 12345' })
  address?: string;

  @ApiProperty({ description: 'Phone number', required: false, example: '+1234567890' })
  phone?: string;
}

export class UpdateClientDto {
  @ApiProperty({ description: 'Client name', required: false })
  name?: string;

  @ApiProperty({ description: 'Client email', required: false })
  email?: string;

  @ApiProperty({ description: 'Company name', required: false })
  company?: string;

  @ApiProperty({ description: 'Client address', required: false })
  address?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phone?: string;
}

export class ClientResponseDto {
  @ApiProperty({ description: 'Unique client ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ description: 'Client name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'Client email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: 'Company name', required: false, example: 'Acme Corporation' })
  company?: string;

  @ApiProperty({ description: 'Client address', required: false })
  address?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Total amount from invoices', example: 25000 })
  totalAmount: number;

  @ApiProperty({ description: 'Number of invoices', example: 5 })
  invoiceCount: number;

  @ApiProperty({ description: 'Creation date', example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;
}



