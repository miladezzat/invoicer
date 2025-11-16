import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto } from './dto/pagination.dto';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { Feature } from '../../config/features.config';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @UseGuards(FeatureGuard)
  @RequireFeature(Feature.CLIENT_MANAGEMENT)
  async create(
    @CurrentUser() user: any,
    @Body() createClientDto: CreateClientDto,
  ) {
    const client = await this.clientsService.create(user._id, createClientDto);
    return {
      success: true,
      client,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.clientsService.findAll(user._id, paginationDto);
    return {
      success: true,
      clients: result.data,
      pagination: result.pagination,
    };
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    const stats = await this.clientsService.getClientStats(user._id);
    return {
      success: true,
      stats,
    };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const client = await this.clientsService.findOne(user._id, id);
    return {
      success: true,
      client,
    };
  }

  @Put(':id')
  @UseGuards(FeatureGuard)
  @RequireFeature(Feature.CLIENT_MANAGEMENT)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    const client = await this.clientsService.update(
      user._id,
      id,
      updateClientDto,
    );
    return {
      success: true,
      client,
    };
  }

  @Delete(':id')
  @UseGuards(FeatureGuard)
  @RequireFeature(Feature.CLIENT_MANAGEMENT)
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.clientsService.delete(user._id, id);
    return {
      success: true,
      message: 'Client deleted successfully',
    };
  }
}
