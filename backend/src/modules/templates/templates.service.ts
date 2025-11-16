import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Template, TemplateDocument } from '../../schemas/template.schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(@InjectModel(Template.name) private templateModel: Model<TemplateDocument>) {}

  async create(userId: string, createTemplateDto: CreateTemplateDto): Promise<TemplateDocument> {
    const template = new this.templateModel({
      userId: new Types.ObjectId(userId),
      ...createTemplateDto,
    });
    return template.save();
  }

  async findAll(userId: string): Promise<TemplateDocument[]> {
    return this.templateModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<TemplateDocument> {
    const template = await this.templateModel
      .findOne({
        _id: id,
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .exec();

    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async update(id: string, userId: string, updateTemplateDto: UpdateTemplateDto): Promise<TemplateDocument> {
    const template = await this.findOne(id, userId);
    Object.assign(template, updateTemplateDto);
    return template.save();
  }

  async delete(id: string, userId: string): Promise<void> {
    const template = await this.findOne(id, userId);
    template.isDeleted = true;
    await template.save();
  }
}

