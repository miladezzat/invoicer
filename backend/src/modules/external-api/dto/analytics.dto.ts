import { ApiProperty } from '@nestjs/swagger';

export class InvoiceStatsDto {
  @ApiProperty({ description: 'Total number of invoices', example: 45 })
  total: number;

  @ApiProperty({ description: 'Number of paid invoices', example: 30 })
  paid: number;

  @ApiProperty({ description: 'Number of pending invoices', example: 10 })
  pending: number;

  @ApiProperty({ description: 'Number of overdue invoices', example: 5 })
  overdue: number;

  @ApiProperty({ description: 'Total revenue from all invoices', example: 125000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Revenue from paid invoices', example: 95000 })
  paidRevenue: number;
}

export class AnalyticsResponseDto {
  @ApiProperty({ type: InvoiceStatsDto, description: 'Invoice statistics' })
  invoiceStats: InvoiceStatsDto;

  @ApiProperty({ description: 'Revenue over time', type: 'array', example: [] })
  revenueOverTime: any[];

  @ApiProperty({ description: 'Top clients by revenue', type: 'array', example: [] })
  topClients: any[];

  @ApiProperty({ description: 'Revenue breakdown by currency', example: { USD: 100000, EUR: 25000 } })
  currencyBreakdown: Record<string, number>;
}



