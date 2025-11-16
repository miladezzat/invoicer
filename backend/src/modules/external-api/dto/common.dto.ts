import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty({ description: 'Request success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response message', example: 'Operation completed successfully' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Request success status', example: false })
  success: boolean;

  @ApiProperty({ description: 'Error message', example: 'Resource not found' })
  message: string;

  @ApiProperty({ description: 'Error code', required: false, example: 'NOT_FOUND' })
  error?: string;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  pages: number;
}



