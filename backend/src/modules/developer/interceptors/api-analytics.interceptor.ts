import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiAnalyticsService } from '../api-analytics.service';

@Injectable()
export class ApiAnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiAnalyticsInterceptor.name);

  constructor(private readonly apiAnalyticsService: ApiAnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, user, headers, query, apiKey } = request;
    const userId = user?._id?.toString();
    const apiKeyId = apiKey?._id?.toString();

    return next.handle().pipe(
      tap(() => {
        // Log successful request
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        if (userId) {
          this.apiAnalyticsService
            .logRequest({
              userId,
              apiKeyId,
              endpoint: this.normalizeEndpoint(url),
              method,
              statusCode,
              responseTime,
              ip: request.ip || request.connection?.remoteAddress,
              userAgent: headers['user-agent'],
              queryParams: Object.keys(query || {}).length > 0 ? query : undefined,
            })
            .catch((err) =>
              this.logger.error('Failed to log analytics:', err),
            );
        }
      }),
      catchError((error) => {
        // Log failed request
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        if (userId) {
          this.apiAnalyticsService
            .logRequest({
              userId,
              apiKeyId,
              endpoint: this.normalizeEndpoint(url),
              method,
              statusCode,
              responseTime,
              ip: request.ip || request.connection?.remoteAddress,
              userAgent: headers['user-agent'],
              queryParams: Object.keys(query || {}).length > 0 ? query : undefined,
              errorMessage: error.message || 'Unknown error',
            })
            .catch((err) =>
              this.logger.error('Failed to log analytics:', err),
            );
        }

        throw error;
      }),
    );
  }

  /**
   * Normalize endpoint URL to remove dynamic IDs for better grouping
   * Example: /api/invoices/123 -> /api/invoices/:id
   */
  private normalizeEndpoint(url: string): string {
    // Remove query string
    const path = url.split('?')[0];
    
    // Replace UUIDs and ObjectIDs with :id
    return path
      .replace(/\/[0-9a-f]{24}\b/gi, '/:id') // MongoDB ObjectId
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '/:id') // UUID
      .replace(/\/\d+\b/g, '/:id'); // Numeric IDs
  }
}









