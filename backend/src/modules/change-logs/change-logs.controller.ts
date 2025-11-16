import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ChangeLogsService } from './change-logs.service';
import { QueryChangeLogDto } from './dto/query-change-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Change Logs Controller - READ ONLY
 * 
 * Note: Logs are created AUTOMATICALLY by the system internally.
 * This controller only provides endpoints to QUERY/READ the logs.
 * No manual log creation is allowed via API.
 */
@Controller('change-logs')
@UseGuards(JwtAuthGuard)
export class ChangeLogsController {
  constructor(private readonly changeLogsService: ChangeLogsService) {}

  /**
   * Get all change logs with filters and pagination
   * READ ONLY - Logs are automatically created by the system
   */
  @Get()
  findAll(@Query() query: QueryChangeLogDto) {
    return this.changeLogsService.findAll(query);
  }

  /**
   * Get change logs for a specific document
   */
  @Get('document/:collectionName/:documentId')
  findByDocument(
    @Param('collectionName') collectionName: string,
    @Param('documentId') documentId: string,
  ) {
    return this.changeLogsService.findByDocument(collectionName, documentId);
  }

  /**
   * Get change logs for current user
   */
  @Get('my-activity')
  findMyActivity(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.changeLogsService.findByUser(user._id, page, limit);
  }

  /**
   * Get change logs for a specific user (admin only)
   */
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.changeLogsService.findByUser(userId, page, limit);
  }

  /**
   * Get statistics about change logs
   */
  @Get('statistics')
  getStatistics(@CurrentUser() user: any) {
    return this.changeLogsService.getStatistics(user._id);
  }

  /**
   * Get global statistics (admin only)
   */
  @Get('statistics/global')
  getGlobalStatistics() {
    return this.changeLogsService.getStatistics();
  }
}

