import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [PublicController],
})
export class PublicModule {}

