import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { PaginationDto, PaginatedResponse } from './dto/pagination.dto';
import { WebhooksService } from '../developer/webhooks.service';
import { WebhookEvent } from '../../schemas/webhook.schema';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private webhooksService: WebhooksService,
  ) {}

   async create(userId: string, createClientDto: any): Promise<ClientDocument> {
    try {
      const client = new this.clientModel({
        ...createClientDto,
        userId: new Types.ObjectId(userId),
        invoiceCounter: 0,
        totalInvoiced: 0,
        totalPaid: 0,
      });

      const savedClient = await client.save();

      this.logger.log(`Client created: ${savedClient.name}`);

      // Trigger webhook
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.CLIENT_CREATED,
        savedClient.toObject(),
      ).catch(err => this.logger.error('Failed to trigger webhook:', err));

      return savedClient;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('A client with this name already exists');
      }
      throw error;
    }
  }

  async findAll(userId: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search = '' } = paginationDto || {};
    
    // Build the match query
    const matchQuery: any = { userId: new Types.ObjectId(userId) };
    
    // Add search filter if provided
    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Use aggregation to calculate totals dynamically from invoices
    const data = await this.clientModel.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'invoices',
          let: { clientId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$clientId', '$$clientId'] },
                    { $ne: ['$isDeleted', true] }
                  ]
                }
              }
            }
          ],
          as: 'invoices'
        }
      },
      {
        $addFields: {
          // Count total invoices
          totalInvoices: { $size: '$invoices' },
          // Calculate total outstanding (unpaid invoices)
          totalInvoiced: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$invoices',
                    as: 'invoice',
                    cond: { $ne: ['$$invoice.status', 'paid'] }
                  }
                },
                as: 'unpaidInvoice',
                in: '$$unpaidInvoice.total'
              }
            }
          },
          // Calculate total paid
          totalPaid: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$invoices',
                    as: 'invoice',
                    cond: { $eq: ['$$invoice.status', 'paid'] }
                  }
                },
                as: 'paidInvoice',
                in: '$$paidInvoice.total'
              }
            }
          }
        }
      },
      // Remove the invoices array from the output
      { $project: { invoices: 0 } }
    ]).exec();

    // Get total count
    const total = await this.clientModel.countDocuments(matchQuery).exec();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(userId: string, clientId: string): Promise<any> {
    const result = await this.clientModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(clientId),
          userId: new Types.ObjectId(userId),
        }
      },
      {
        $lookup: {
          from: 'invoices',
          let: { clientId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$clientId', '$$clientId'] },
                    { $ne: ['$isDeleted', true] }
                  ]
                }
              }
            }
          ],
          as: 'invoices'
        }
      },
      {
        $addFields: {
          // Count total invoices
          totalInvoices: { $size: '$invoices' },
          // Calculate total outstanding (unpaid invoices)
          totalInvoiced: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$invoices',
                    as: 'invoice',
                    cond: { $ne: ['$$invoice.status', 'paid'] }
                  }
                },
                as: 'unpaidInvoice',
                in: '$$unpaidInvoice.total'
              }
            }
          },
          // Calculate total paid
          totalPaid: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$invoices',
                    as: 'invoice',
                    cond: { $eq: ['$$invoice.status', 'paid'] }
                  }
                },
                as: 'paidInvoice',
                in: '$$paidInvoice.total'
              }
            }
          }
        }
      },
      // Remove the invoices array from the output
      { $project: { invoices: 0 } }
    ]).exec();

    if (!result || result.length === 0) {
      throw new NotFoundException('Client not found');
    }

    return result[0];
  }

  async update(
    userId: string,
    clientId: string,
    updateClientDto: any,
  ): Promise<ClientDocument> {
    try {
      const client = await this.clientModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(clientId),
            userId: new Types.ObjectId(userId),
          },
          { $set: updateClientDto },
          { new: true },
        )
        .exec();

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      this.logger.log(`Client updated: ${client.name}`);

      // Trigger webhook
      this.webhooksService.triggerWebhooks(
        userId,
        WebhookEvent.CLIENT_UPDATED,
        client.toObject(),
      ).catch(err => this.logger.error('Failed to trigger webhook:', err));

      return client;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('A client with this name already exists');
      }
      throw error;
    }
  }

  async delete(userId: string, clientId: string): Promise<void> {
    // Get client data before deleting for webhook
    const client = await this.clientModel
      .findOne({
        _id: new Types.ObjectId(clientId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Store client data for webhook
    const clientData = client.toObject();

    // Delete the client
    const result = await this.clientModel
      .deleteOne({
        _id: new Types.ObjectId(clientId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Client not found');
    }

    this.logger.log(`Client deleted: ${clientData.name}`);

    // Trigger webhook with the deleted client data
    this.webhooksService.triggerWebhooks(
      userId,
      WebhookEvent.CLIENT_DELETED,
      clientData,
    ).catch(err => this.logger.error('Failed to trigger webhook:', err));
  }

  async incrementInvoiceCounter(
    userId: string,
    clientId: string,
  ): Promise<number> {
    const client = await this.clientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(clientId),
          userId: new Types.ObjectId(userId),
        },
        { $inc: { invoiceCounter: 1 } },
        { new: true },
      )
      .exec();

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client.invoiceCounter;
  }

  async updateFinancials(
    userId: string,
    clientId: string,
    totalInvoiced: number,
    totalPaid: number,
  ): Promise<void> {
    await this.clientModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(clientId),
          userId: new Types.ObjectId(userId),
        },
        {
          $inc: {
            totalInvoiced,
            totalPaid,
          },
        },
      )
      .exec();
  }

  async getClientStats(userId: string): Promise<{
    totalClients: number;
    activeClients: number;
    totalInvoiced: number;
    totalPaid: number;
  }> {
    // Get client stats
    const clientStats = await this.clientModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalClients: { $sum: 1 },
          activeClients: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
        },
      },
    ]);

    // Calculate invoice totals dynamically from invoices
    const invoiceStats = await this.invoiceModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          isDeleted: { $ne: true },
          clientId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalInvoiced: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'paid'] },
                '$total',
                0
              ]
            }
          },
          totalPaid: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'paid'] },
                '$total',
                0
              ]
            }
          }
        }
      }
    ]);

    return {
      totalClients: clientStats[0]?.totalClients || 0,
      activeClients: clientStats[0]?.activeClients || 0,
      totalInvoiced: invoiceStats[0]?.totalInvoiced || 0,
      totalPaid: invoiceStats[0]?.totalPaid || 0,
    };
  }
}
