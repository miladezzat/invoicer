import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() createTemplateDto: CreateTemplateDto) {
    const template = await this.templatesService.create(user._id.toString(), createTemplateDto);
    return { template };
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const templates = await this.templatesService.findAll(user._id.toString());
    return { templates };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const template = await this.templatesService.findOne(id, user._id.toString());
    return { template };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.templatesService.update(id, user._id.toString(), updateTemplateDto);
    return { template };
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.templatesService.delete(id, user._id.toString());
    return { message: 'Template deleted successfully' };
  }
}

