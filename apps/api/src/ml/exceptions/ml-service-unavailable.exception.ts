import { ServiceUnavailableException } from '@nestjs/common';

export class MlServiceUnavailableException extends ServiceUnavailableException {
  constructor(message: string = 'ML service is unavailable') {
    super({
      statusCode: 503,
      message,
      error: 'ML_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }
}
