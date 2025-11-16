import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangeLogsController } from './change-logs.controller';
import { ChangeLogsService } from './change-logs.service';
import { ChangeLog, ChangeLogSchema } from '../../schemas/change-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChangeLog.name, schema: ChangeLogSchema },
    ]),
  ],
  controllers: [ChangeLogsController],
  providers: [ChangeLogsService],
  exports: [ChangeLogsService],
})
export class ChangeLogsModule {}

