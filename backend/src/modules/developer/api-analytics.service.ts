import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiAnalytics, ApiAnalyticsDocument } from '../../schemas/api-analytics.schema';

export interface ApiAnalyticsLog {
  userId: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ip?: string;
  userAgent?: string;
  queryParams?: Record<string, any>;
  errorMessage?: string;
}

export interface ApiAnalyticsStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: { endpoint: string; count: number }[];
  requestsByMethod: { method: string; count: number }[];
  requestsByStatusCode: { statusCode: number; count: number }[];
  requestsOverTime: { date: string; count: number }[];
  topErrors: { message: string; count: number }[];
}

@Injectable()
export class ApiAnalyticsService {
  private readonly logger = new Logger(ApiAnalyticsService.name);

  constructor(
    @InjectModel(ApiAnalytics.name)
    private apiAnalyticsModel: Model<ApiAnalyticsDocument>,
  ) {}

  /**
   * Log an API request
   */
  async logRequest(log: ApiAnalyticsLog): Promise<void> {
    try {
      const analytics = new this.apiAnalyticsModel({
        userId: new Types.ObjectId(log.userId),
        apiKeyId: log.apiKeyId ? new Types.ObjectId(log.apiKeyId) : undefined,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        ip: log.ip,
        userAgent: log.userAgent,
        queryParams: log.queryParams,
        errorMessage: log.errorMessage,
        isError: log.statusCode >= 400,
        timestamp: new Date(),
      });

      await analytics.save();
    } catch (error) {
      // Don't let analytics logging break the app
      this.logger.error('Failed to log API analytics:', error);
    }
  }

  /**
   * Get analytics statistics for a user
   */
  async getStats(
    userId: string,
    period: '24h' | '7d' | '30d' | '90d' = '30d',
  ): Promise<ApiAnalyticsStats> {
    const periodMs = this.getPeriodInMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const matchQuery = {
      userId: new Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    };

    // Run aggregations in parallel
    const [
      totalStats,
      endpointStats,
      methodStats,
      statusCodeStats,
      timeSeriesStats,
      errorStats,
    ] = await Promise.all([
      // Total requests and response time
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successfulRequests: {
              $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] },
            },
            failedRequests: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
            averageResponseTime: { $avg: '$responseTime' },
          },
        },
      ]),

      // Requests by endpoint
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { endpoint: '$_id', count: 1, _id: 0 } },
      ]),

      // Requests by method
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$method', count: { $sum: 1 } } },
        { $project: { method: '$_id', count: 1, _id: 0 } },
      ]),

      // Requests by status code
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { statusCode: '$_id', count: 1, _id: 0 } },
      ]),

      // Requests over time
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),

      // Top errors
      this.apiAnalyticsModel.aggregate([
        { $match: { ...matchQuery, isError: true } },
        { $group: { _id: '$errorMessage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { message: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return {
      totalRequests: totalStats[0]?.totalRequests || 0,
      successfulRequests: totalStats[0]?.successfulRequests || 0,
      failedRequests: totalStats[0]?.failedRequests || 0,
      averageResponseTime:
        Math.round(totalStats[0]?.averageResponseTime || 0),
      requestsByEndpoint: endpointStats,
      requestsByMethod: methodStats,
      requestsByStatusCode: statusCodeStats,
      requestsOverTime: timeSeriesStats,
      topErrors: errorStats.filter((e) => e.message),
    };
  }

  /**
   * Get analytics for a specific API key
   */
  async getApiKeyStats(
    userId: string,
    apiKeyId: string,
    period: '24h' | '7d' | '30d' | '90d' = '30d',
  ): Promise<Partial<ApiAnalyticsStats>> {
    const periodMs = this.getPeriodInMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const matchQuery = {
      userId: new Types.ObjectId(userId),
      apiKeyId: new Types.ObjectId(apiKeyId),
      timestamp: { $gte: startDate },
    };

    const [totalStats, endpointStats, timeSeriesStats] = await Promise.all([
      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successfulRequests: {
              $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] },
            },
            failedRequests: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
            averageResponseTime: { $avg: '$responseTime' },
          },
        },
      ]),

      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { endpoint: '$_id', count: 1, _id: 0 } },
      ]),

      this.apiAnalyticsModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return {
      totalRequests: totalStats[0]?.totalRequests || 0,
      successfulRequests: totalStats[0]?.successfulRequests || 0,
      failedRequests: totalStats[0]?.failedRequests || 0,
      averageResponseTime:
        Math.round(totalStats[0]?.averageResponseTime || 0),
      requestsByEndpoint: endpointStats,
      requestsOverTime: timeSeriesStats,
    };
  }

  /**
   * Get recent API requests (for debugging/monitoring)
   */
  async getRecentRequests(
    userId: string,
    limit: number = 50,
  ): Promise<ApiAnalyticsDocument[]> {
    return this.apiAnalyticsModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('apiKeyId', 'name prefix')
      .exec();
  }

  /**
   * Convert period string to milliseconds
   */
  private getPeriodInMs(period: '24h' | '7d' | '30d' | '90d'): number {
    const periods = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }
}









