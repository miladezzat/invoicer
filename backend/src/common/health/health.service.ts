import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Basic health check
   */
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Detailed health check with all dependencies
   */
  async detailedCheck() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: await this.checkDatabase(),
        memory: this.checkMemory(),
        stripe: this.checkStripe(),
        email: this.checkEmail(),
      },
    };

    // Overall status is unhealthy if any check fails
    const hasFailure = Object.values(checks.checks).some(
      (check: any) => check.status !== 'ok',
    );

    if (hasFailure) {
      checks.status = 'degraded';
    }

    return checks;
  }

  /**
   * Readiness check - service is ready to accept traffic
   */
  async readiness() {
    const dbCheck = await this.checkDatabase();

    if (dbCheck.status !== 'ok') {
      throw new Error('Database not ready');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check database connection
   */
  private async checkDatabase() {
    try {
      if (this.connection.readyState === 1) {
        return {
          status: 'ok',
          readyState: 'connected',
          host: this.connection.host,
          name: this.connection.name,
        };
      } else {
        return {
          status: 'error',
          readyState: this.getReadyStateString(this.connection.readyState),
          message: 'Database not connected',
        };
      }
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory() {
    const used = process.memoryUsage();
    const total = used.heapTotal;
    const usage = (used.heapUsed / total) * 100;

    return {
      status: usage > 90 ? 'warning' : 'ok',
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      usagePercent: `${usage.toFixed(2)}%`,
    };
  }

  /**
   * Check if Stripe is configured
   */
  private checkStripe() {
    const isConfigured = !!process.env.STRIPE_SECRET_KEY;
    return {
      status: 'ok',
      configured: isConfigured,
      message: isConfigured ? 'Stripe configured' : 'Stripe not configured (optional)',
    };
  }

  /**
   * Check if email service is configured
   */
  private checkEmail() {
    const isConfigured = !!process.env.RESEND_API_KEY;
    return {
      status: 'ok',
      configured: isConfigured,
      message: isConfigured ? 'Email configured' : 'Email not configured (optional)',
    };
  }

  /**
   * Get human-readable connection state
   */
  private getReadyStateString(state: number): string {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[state] || 'unknown';
  }
}

