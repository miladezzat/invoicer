import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new LoggerService();
  logger.setContext('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: logger,
  });

  // Enable trust proxy to get real client IP behind proxies
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Note: Throttler guard is applied via APP_GUARD in modules, not here

  // Security - Configure Helmet with CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix (exclude webhook routes for Stripe and public API routes)
  app.setGlobalPrefix('api', {
    exclude: [
      'health(.*)', // Exclude health check endpoints
      'stripe/webhook',
      'stripe/webhook-connect',
      'public/(.*)', // Exclude all public API routes
    ],
  });

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Invoicer API')
    .setDescription('External API for integrating invoicing system with external applications. Automate workflows, sync data, and build custom integrations.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Enter your API key (format: inv_xxxxx_xxxxxxxxxxxx)',
        in: 'header',
      },
      'api-key',
    )
    .addServer(process.env.API_URL || 'http://localhost:3001', 'API Server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [], // Include all modules by default
  });

  // Serve Swagger UI at /api-docs
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Invoicer API Documentation',
    customfavIcon: '/favicon.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  logger.log(`🚀 API running on http://localhost:${port}/api`);
  logger.log(`📚 API documentation: http://localhost:${port}/api-docs`);
  logger.log(`📋 OpenAPI JSON: http://localhost:${port}/api-docs-json`);
  logger.log(`📡 Stripe subscription webhook: http://localhost:${port}/stripe/webhook`);
  logger.log(`📡 Stripe Connect webhook: http://localhost:${port}/stripe/webhook-connect`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Setup graceful shutdown
  setupGracefulShutdown(app, logger);
}

function setupGracefulShutdown(app: any, logger: LoggerService) {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        await app.close();
        logger.log('Application closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error instanceof Error ? error.stack : String(error));
        process.exit(1);
      }
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.stack);
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection:', reason instanceof Error ? reason.stack : String(reason));
    process.exit(1);
  });
}

bootstrap();

