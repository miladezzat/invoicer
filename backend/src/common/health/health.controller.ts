import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Returns 200 OK if the service is running
   */
  @Get()
  async check() {
    return this.healthService.check();
  }

  /**
   * Detailed health check with dependencies
   * Checks database, external services, etc.
   */
  @Get('detailed')
  async detailedCheck() {
    return this.healthService.detailedCheck();
  }

  /**
   * Liveness probe for Kubernetes/container orchestration
   * Should always return 200 if the process is alive
   */
  @Get('live')
  async liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe for Kubernetes/container orchestration
   * Returns 200 only if the service is ready to accept traffic
   */
  @Get('ready')
  async readiness() {
    return this.healthService.readiness();
  }
}

