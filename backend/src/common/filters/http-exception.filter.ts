import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Extract error details
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message,
    };

    // Log the error
    if (status >= 500) {
      // Server errors - log with full details
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${errorResponse.message}`,
      );
    }

    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      response.status(status).json({
        statusCode: status,
        timestamp: errorResponse.timestamp,
        message: 'Internal server error',
        path: request.url,
      });
    } else {
      // In development, include full error details
      response.status(status).json({
        ...errorResponse,
        ...(process.env.NODE_ENV !== 'production' &&
          exception instanceof Error && {
            stack: exception.stack,
            details: exception,
          }),
      });
    }
  }
}

