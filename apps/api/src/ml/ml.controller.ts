import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MlService } from './ml.service';

@Controller('ml')
@ApiTags('ML')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check ML service health' })
  @ApiResponse({
    status: 200,
    description: 'ML service health status',
  })
  async health() {
    const isHealthy = await this.mlService.healthCheck();
    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'ml',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('model/info')
  @ApiOperation({ summary: 'Get ML model information' })
  @ApiResponse({
    status: 200,
    description: 'ML model metadata',
  })
  async modelInfo() {
    return this.mlService.getModelInfo();
  }
}
