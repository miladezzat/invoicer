import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChangeLog, ChangeLogDocument } from '../../schemas/change-log.schema';
import { CreateChangeLogDto } from './dto/create-change-log.dto';
import { QueryChangeLogDto } from './dto/query-change-log.dto';

@Injectable()
export class ChangeLogsService {
  constructor(
    @InjectModel(ChangeLog.name)
    private changeLogModel: Model<ChangeLogDocument>,
  ) {}

  /**
   * Create a new change log entry
   */
  async create(createChangeLogDto: CreateChangeLogDto): Promise<ChangeLog> {
    const createdLog = new this.changeLogModel(createChangeLogDto);
    return createdLog.save();
  }

  /**
   * Log a change with automatic diff calculation
   */
  async logChange(params: {
    collectionName: string;
    documentId: string | Types.ObjectId;
    operation: 'create' | 'update' | 'delete' | 'patch';
    changeContext: string;
    oldData?: any;
    newData: any;
    userId?: string | Types.ObjectId | null;
    modifierName?: string;
    source?: 'user' | 'integration' | 'system' | 'api';
    externalSystem?: string;
    clientIp?: string;
    clientBrowser?: string;
  }): Promise<ChangeLog> {
    const {
      collectionName,
      documentId,
      operation,
      changeContext,
      oldData,
      newData,
      userId,
      modifierName,
      source = 'user',
      externalSystem,
      clientIp,
      clientBrowser,
    } = params;

    // Calculate differences
    const changes = this.calculateDiff(oldData, newData);
    const rawChanges = operation === 'create' ? newData : changes;

    return this.create({
      collectionName,
      documentId: documentId as any,
      changeContext,
      changes,
      rawChanges,
      snapshot: newData,
      operation,
      userId: userId as any,
      modifierName,
      source,
      externalSystem,
      clientIp,
      clientBrowser,
    });
  }

  /**
   * Find all change logs with filters
   */
  async findAll(query: QueryChangeLogDto) {
    const { page = 1, limit = 50, startDate, endDate, ...filters } = query;

    const filter: any = {};

    // Apply filters
    if (filters.collectionName) {
      filter.collectionName = filters.collectionName;
    }
    if (filters.documentId) {
      filter.documentId = new Types.ObjectId(filters.documentId);
    }
    if (filters.userId) {
      filter.userId = new Types.ObjectId(filters.userId);
    }
    if (filters.operation) {
      filter.operation = filters.operation;
    }
    if (filters.source) {
      filter.source = filters.source;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.changeLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('changedBy', 'name email')
        .exec(),
      this.changeLogModel.countDocuments(filter),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find change logs for a specific document
   */
  async findByDocument(collectionName: string, documentId: string) {
    return this.changeLogModel
      .find({
        collectionName,
        documentId: new Types.ObjectId(documentId),
      })
      .sort({ createdAt: -1 })
      .populate('changedBy', 'name email')
      .exec();
  }

  /**
   * Find change logs for a specific user
   */
  async findByUser(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.changeLogModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.changeLogModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get statistics about change logs
   */
  async getStatistics(userId?: string) {
    const filter = userId ? { userId: new Types.ObjectId(userId) } : {};

    const [
      totalLogs,
      operationStats,
      sourceStats,
      recentActivity,
    ] = await Promise.all([
      this.changeLogModel.countDocuments(filter),
      this.changeLogModel.aggregate([
        { $match: filter },
        { $group: { _id: '$operation', count: { $sum: 1 } } },
      ]),
      this.changeLogModel.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      this.changeLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('changedBy', 'name email')
        .exec(),
    ]);

    return {
      totalLogs,
      operationStats,
      sourceStats,
      recentActivity,
    };
  }

  /**
   * Calculate the difference between old and new data
   */
  private calculateDiff(oldData: any, newData: any): Record<string, any> {
    if (!oldData) {
      return newData || {};
    }

    const diff: Record<string, any> = {};

    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      // Store the change with before/after
      diff[key] = {
        from: oldValue,
        to: newValue,
      };
    }

    return diff;
  }

  /**
   * Delete old logs (for cleanup/maintenance)
   */
  async deleteOldLogs(daysOld: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.changeLogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return {
      deletedCount: result.deletedCount,
      cutoffDate,
    };
  }
}

