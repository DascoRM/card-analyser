import { BadRequestException } from '@nestjs/common';

export class MlAnalysisFailedException extends BadRequestException {
  constructor(message: string) {
    super({
      statusCode: 400,
      message,
      error: 'ML_ANALYSIS_FAILED',
      timestamp: new Date().toISOString(),
    });
  }
}
