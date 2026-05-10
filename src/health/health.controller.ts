import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }
}
