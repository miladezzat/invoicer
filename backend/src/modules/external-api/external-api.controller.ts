import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../developer/guards/api-key-auth.guard';
import { ApiAnalyticsInterceptor } from '../developer/interceptors/api-analytics.interceptor';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceResponseDto } from './dto/invoice.dto';
import { CreateClientDto, UpdateClientDto, ClientResponseDto } from './dto/client.dto';
import { AnalyticsResponseDto } from './dto/analytics.dto';
import { ErrorResponseDto } from './dto/common.dto';

@ApiTags('External API')
@ApiBearerAuth('api-key')
@Controller('public/apis/v1')
@UseGuards(ApiKeyAuthGuard)
@UseInterceptors(ApiAnalyticsInterceptor)
export class ExternalApiController {
  constructor(
    private readonly invoiceService: InvoicesService,
    private readonly clientService: ClientsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ==================== INVOICES ====================

  @Get('invoices')
  @ApiOperation({ summary: 'List all invoices', description: 'Retrieve a list of all your invoices with optional status filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'sent', 'paid', 'cancelled'], description: 'Filter by invoice status' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved invoices' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async listInvoices(@Req() req: any, @Query('status') status?: string) {
    const userId = req.user._id.toString();
    const result = await this.invoiceService.findAll(userId, { status });
    
    return {
      success: true,
      data: result.invoices,
      total: result.total,
    };
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID', description: 'Retrieve a specific invoice by its unique identifier' })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved invoice', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async getInvoice(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id.toString();
    const invoice = await this.invoiceService.findOne(id, userId);
    
    return {
      success: true,
      data: invoice,
    };
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new invoice', description: 'Create a new invoice with line items' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully', type: InvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async createInvoice(@Req() req: any, @Body() createInvoiceDto: CreateInvoiceDto) {
    const userId = req.user._id.toString();
    const invoice = await this.invoiceService.create(userId, createInvoiceDto);
    
    return {
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    };
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Update invoice', description: 'Update an existing invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async updateInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const userId = req.user._id.toString();
    const invoice = await this.invoiceService.update(id, userId, updateInvoiceDto);
    
    return {
      success: true,
      data: invoice,
      message: 'Invoice updated successfully',
    };
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Delete invoice', description: 'Permanently delete an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async deleteInvoice(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id.toString();
    await this.invoiceService.delete(id, userId);
    
    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  // ==================== CLIENTS ====================

  @Get('clients')
  @ApiOperation({ summary: 'List all clients', description: 'Retrieve a list of all your clients with optional search and pagination' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term to filter clients by name, email, or company' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 100 })
  @ApiResponse({ status: 200, description: 'Successfully retrieved clients' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async listClients(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
  ) {
    const userId = req.user._id.toString();
    const result = await this.clientService.findAll(userId, {
      search,
      page,
      limit,
    });
    
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Get client by ID', description: 'Retrieve a specific client by their unique identifier' })
  @ApiParam({ name: 'id', description: 'Client ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved client', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async getClient(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id.toString();
    const client = await this.clientService.findOne(id, userId);
    
    return {
      success: true,
      data: client,
    };
  }

  @Post('clients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new client', description: 'Create a new client in your database' })
  @ApiResponse({ status: 201, description: 'Client created successfully', type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async createClient(@Req() req: any, @Body() createClientDto: CreateClientDto) {
    const userId = req.user._id.toString();
    const client = await this.clientService.create(userId, createClientDto);
    
    return {
      success: true,
      data: client,
      message: 'Client created successfully',
    };
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Update client', description: 'Update an existing client\'s information' })
  @ApiParam({ name: 'id', description: 'Client ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Client updated successfully', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async updateClient(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    const userId = req.user._id.toString();
    const client = await this.clientService.update(userId, id, updateClientDto);
    
    return {
      success: true,
      data: client,
      message: 'Client updated successfully',
    };
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Delete client', description: 'Permanently delete a client from your database' })
  @ApiParam({ name: 'id', description: 'Client ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  @ApiResponse({ status: 404, description: 'Client not found', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async deleteClient(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id.toString();
    await this.clientService.delete(userId, id);
    
    return {
      success: true,
      message: 'Client deleted successfully',
    };
  }

  // ==================== ANALYTICS ====================

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data', description: 'Retrieve business analytics for a specific time period' })
  @ApiQuery({ name: 'period', required: false, enum: ['30d', '90d', '1y', 'all'], description: 'Time period for analytics', example: '30d' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved analytics', type: AnalyticsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key', type: ErrorResponseDto })
  async getAnalytics(
    @Req() req: any,
    @Query('period') period: '30d' | '90d' | '1y' | 'all' = '30d',
  ) {
    const userId = req.user._id.toString();
    const analytics = await this.analyticsService.getAnalytics(userId, period);
    
    return {
      success: true,
      data: analytics,
    };
  }

  // ==================== HEALTH CHECK ====================

  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Check if the API is operational' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  healthCheck() {
    return {
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

