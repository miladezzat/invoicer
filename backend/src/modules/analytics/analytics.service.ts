import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';

export interface RevenueData {
  month: string;
  revenue: number;
  invoiceCount: number;
}

export interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  draft: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
}

export interface TopClient {
  clientId: string;
  clientName: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface AnalyticsSummary {
  invoiceStats: InvoiceStats;
  revenueOverTime: RevenueData[];
  topClients: TopClient[];
  recentActivity: any[];
  currencyBreakdown: Record<string, number>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Client.name) private _clientModel: Model<ClientDocument>,
  ) {}

  /**
   * Get comprehensive analytics for a user
   */
  async getAnalytics(userId: string, period: '30d' | '90d' | '1y' | 'all' = '30d'): Promise<AnalyticsSummary> {
    this.logger.log(`Getting analytics for user ${userId}, period: ${period}`);

    const dateFilter = this.getDateFilter(period);

    const [
      invoiceStats,
      revenueOverTime,
      topClients,
      recentActivity,
      currencyBreakdown,
    ] = await Promise.all([
      this.getInvoiceStats(userId, dateFilter),
      this.getRevenueOverTime(userId, dateFilter),
      this.getTopClients(userId, dateFilter),
      this.getRecentActivity(userId),
      this.getCurrencyBreakdown(userId, dateFilter),
    ]);

    return {
      invoiceStats,
      revenueOverTime,
      topClients,
      recentActivity,
      currencyBreakdown,
    };
  }

  /**
   * Get invoice statistics
   */
  private async getInvoiceStats(userId: string, dateFilter: any): Promise<InvoiceStats> {
    const query = { userId: new Types.ObjectId(userId), ...dateFilter };

    const [total, paid, pending, overdue, draft] = await Promise.all([
      this.invoiceModel.countDocuments(query),
      this.invoiceModel.countDocuments({ ...query, status: 'paid' }),
      this.invoiceModel.countDocuments({ ...query, status: 'pending' }),
      this.invoiceModel.countDocuments({ ...query, status: 'overdue' }),
      this.invoiceModel.countDocuments({ ...query, status: 'draft' }),
    ]);

    // Calculate revenue
    const invoices = await this.invoiceModel.find(query);
    
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;

    invoices.forEach(invoice => {
      const total = invoice.total || 0;
      totalRevenue += total;
      
      if (invoice.status === 'paid') {
        paidRevenue += total;
      } else if (invoice.status === 'pending' || invoice.status === 'overdue') {
        pendingRevenue += total;
      }
    });

    return {
      total,
      paid,
      pending,
      overdue,
      draft,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
    };
  }

  /**
   * Get revenue over time (monthly breakdown)
   */
  private async getRevenueOverTime(userId: string, dateFilter: any): Promise<RevenueData[]> {
    const query = { userId: new Types.ObjectId(userId), ...dateFilter, status: { $in: ['paid', 'pending', 'overdue'] } };
    
    const invoices = await this.invoiceModel.find(query).sort({ issueDate: 1 });

    // Group by month
    const monthlyData = new Map<string, { revenue: number; count: number }>();

    invoices.forEach(invoice => {
      if (!invoice.issueDate) return;

      const date = new Date(invoice.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthlyData.get(monthKey) || { revenue: 0, count: 0 };
      existing.revenue += invoice.total || 0;
      existing.count += 1;
      monthlyData.set(monthKey, existing);
    });

    // Convert to array and sort
    const result: RevenueData[] = [];
    monthlyData.forEach((data, month) => {
      result.push({
        month,
        revenue: data.revenue,
        invoiceCount: data.count,
      });
    });

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get top clients by revenue
   */
  private async getTopClients(userId: string, dateFilter: any): Promise<TopClient[]> {
    const query = { userId: new Types.ObjectId(userId), ...dateFilter, status: { $in: ['paid', 'pending', 'overdue'] } };
    
    const invoices = await this.invoiceModel.find(query).populate('clientId');

    // Group by client
    const clientData = new Map<string, { name: string; revenue: number; count: number }>();

    invoices.forEach(invoice => {
      if (!invoice.clientId) return;

      const clientId = typeof invoice.clientId === 'string' 
        ? invoice.clientId 
        : (invoice.clientId as any)._id.toString();
      
      const clientName = typeof invoice.clientId === 'string'
        ? invoice.clientName || 'Unknown Client'
        : (invoice.clientId as any).name || invoice.clientName || 'Unknown Client';

      const existing = clientData.get(clientId) || { name: clientName, revenue: 0, count: 0 };
      existing.revenue += invoice.total || 0;
      existing.count += 1;
      clientData.set(clientId, existing);
    });

    // Convert to array and sort by revenue
    const result: TopClient[] = [];
    clientData.forEach((data, clientId) => {
      result.push({
        clientId,
        clientName: data.name,
        totalRevenue: data.revenue,
        invoiceCount: data.count,
      });
    });

    return result
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 clients
  }

  /**
   * Get recent activity (last 10 invoices)
   */
  private async getRecentActivity(userId: string): Promise<any[]> {
    const invoices = await this.invoiceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('number status total currency clientName updatedAt');

    return invoices.map(invoice => ({
      id: invoice._id,
      invoiceNumber: invoice.number,
      status: invoice.status,
      total: invoice.total,
      currency: invoice.currency,
      clientName: invoice.clientName,
      date: (invoice as any).updatedAt,
    }));
  }

  /**
   * Get revenue breakdown by currency
   */
  private async getCurrencyBreakdown(userId: string, dateFilter: any): Promise<Record<string, number>> {
    const query = { userId: new Types.ObjectId(userId), ...dateFilter, status: { $in: ['paid', 'pending', 'overdue'] } };
    
    const invoices = await this.invoiceModel.find(query);

    const breakdown: Record<string, number> = {};

    invoices.forEach(invoice => {
      const currency = invoice.currency || 'USD';
      breakdown[currency] = (breakdown[currency] || 0) + (invoice.total || 0);
    });

    return breakdown;
  }

  /**
   * Get date filter based on period
   */
  private getDateFilter(period: '30d' | '90d' | '1y' | 'all'): any {
    if (period === 'all') {
      return {};
    }

    const now = new Date();
    const daysMap = {
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };

    const days = daysMap[period];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      createdAt: { $gte: startDate },
    };
  }

  /**
   * Export analytics data (future feature)
   */
  async exportAnalytics(userId: string, _format: 'csv' | 'json' = 'json'): Promise<any> {
    const analytics = await this.getAnalytics(userId, 'all');
    
    // For now, just return JSON
    // In the future, we can add CSV export based on _format parameter
    return analytics;
  }
}

