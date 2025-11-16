import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ClientsModule } from './modules/clients/clients.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PublicModule } from './modules/public/public.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { EmailModule } from './modules/email/email.module';
import { ChangeLogsModule } from './modules/change-logs/change-logs.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { HealthModule } from './common/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    // Global modules
    LoggerModule,
    
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // Connection pool settings
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        // Retry settings
        retryWrites: true,
        retryReads: true,
        // Auto reconnection
        autoIndex: process.env.NODE_ENV !== 'production', // Don't auto-index in production
        // Connection events
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connected successfully');
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          connection.on('error', (error: Error) => {
            console.error('MongoDB connection error:', error);
          });
          connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000, // 60 seconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'), // 100 requests per minute (more reasonable default)
      },
      {
        name: 'strict',
        ttl: 60000, // 1 minute
        limit: 10, // For sensitive endpoints like auth
      },
    ]),

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    InvoicesModule,
    ClientsModule,
    TemplatesModule,
    PublicModule,
    PdfModule,
    EmailModule,
    ChangeLogsModule,
    StripeModule,
    AnalyticsModule,
    DeveloperModule,
    ExternalApiModule,
  ],
})
export class AppModule {}

