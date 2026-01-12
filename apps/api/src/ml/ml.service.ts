import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IMLAnalysisInput,
  IMLAnalysisOutput,
  IMLHealthResponse,
  IMLModelInfo,
} from './interfaces';
import {
  MlServiceUnavailableException,
  MlAnalysisFailedException,
} from './exceptions';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly mlServiceUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly apiKey: string;
  private readonly enableFallback: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://localhost:5000',
    );
    this.timeout = this.configService.get<number>('ML_TIMEOUT', 30000);
    this.maxRetries = this.configService.get<number>('ML_MAX_RETRIES', 3);
    this.apiKey = this.configService.get<string>('ML_API_KEY', 'dev-api-key');
    this.enableFallback = this.configService.get<boolean>(
      'ML_ENABLE_FALLBACK',
      true,
    );
  }

  /**
   * Analyze a card via the ML service
   */
  async analyzeCard(input: IMLAnalysisInput): Promise<IMLAnalysisOutput> {
    this.logger.log(`Analyzing session ${input.sessionId}`);

    try {
      return await this.performAnalysisWithRetries(input);
    } catch (error) {
      if (this.enableFallback) {
        this.logger.warn(
          `ML service failed, using fallback mock: ${error.message}`,
        );
        return this.fallbackAnalysis(input);
      }
      throw error;
    }
  }

  /**
   * Perform analysis with automatic retries
   */
  private async performAnalysisWithRetries(
    input: IMLAnalysisInput,
  ): Promise<IMLAnalysisOutput> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.performAnalysis(input, attempt);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `ML analysis attempt ${attempt}/${this.maxRetries} failed: ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.exponentialBackoff(attempt);
        }
      }
    }

    throw new MlAnalysisFailedException(
      `Failed after ${this.maxRetries} attempts: ${lastError.message}`,
    );
  }

  /**
   * Perform a single analysis attempt
   */
  private async performAnalysis(
    input: IMLAnalysisInput,
    attempt: number,
  ): Promise<IMLAnalysisOutput> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.post<IMLAnalysisOutput>(
          `${this.mlServiceUrl}/analyze`,
          {
            front_image: input.frontImagePath,
            back_image: input.backImagePath,
            session_id: input.sessionId,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey,
              'X-Request-ID': `${input.sessionId}-${Date.now()}`,
            },
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `ML analysis completed in ${duration}ms (attempt ${attempt})`,
      );

      return this.validateMLResponse(response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new MlServiceUnavailableException('ML service is not reachable');
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new MlServiceUnavailableException('ML service timeout');
      }
      if (error.response?.status >= 500) {
        throw new MlServiceUnavailableException(
          `ML service error: ${error.response.status}`,
        );
      }
      if (error.response?.status === 401) {
        throw new MlAnalysisFailedException('Invalid API key for ML service');
      }
      throw error;
    }
  }

  /**
   * Validate ML service response
   */
  private validateMLResponse(data: unknown): IMLAnalysisOutput {
    const response = data as Record<string, unknown>;

    const requiredFields = [
      'centering',
      'corners',
      'edges',
      'surface',
      'printQuality',
      'finalGrade',
      'gradeLabel',
      'confidence',
      'modelVersion',
      'method',
    ];

    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new MlAnalysisFailedException(`Missing field: ${field}`);
      }
    }

    // Validate score ranges (1-10)
    const scoreFields = [
      'centering',
      'corners',
      'edges',
      'surface',
      'printQuality',
    ];
    for (const field of scoreFields) {
      const value = response[field] as number;
      if (value < 1 || value > 10) {
        throw new MlAnalysisFailedException(
          `${field} must be between 1 and 10, got ${value}`,
        );
      }
    }

    // Validate confidence range (0-1)
    const confidence = response.confidence as number;
    if (confidence < 0 || confidence > 1) {
      throw new MlAnalysisFailedException(
        `confidence must be between 0 and 1, got ${confidence}`,
      );
    }

    return response as unknown as IMLAnalysisOutput;
  }

  /**
   * Exponential backoff between retries
   */
  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    this.logger.debug(`Waiting ${delay}ms before retry`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Fallback mock analysis when ML service is unavailable
   */
  private fallbackAnalysis(input: IMLAnalysisInput): IMLAnalysisOutput {
    this.logger.warn(`Using fallback analysis for session ${input.sessionId}`);

    const randomScore = () => Math.round((7 + Math.random() * 3) * 10) / 10;

    const centering = randomScore();
    const corners = randomScore();
    const edges = randomScore();
    const surface = randomScore();
    const printQuality = randomScore();
    const finalGrade = Math.min(centering, corners, edges, surface, printQuality);
    const gradeLabel = this.getGradeLabel(finalGrade);

    return {
      centering,
      corners,
      edges,
      surface,
      printQuality,
      finalGrade,
      gradeLabel,
      confidence: 0.5, // Low confidence = fallback mode
      modelVersion: 'fallback-v1.0.0',
      method: 'fallback',
      rawData: {
        fallback: true,
        reason: 'ML service unavailable',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get grade label from score
   */
  private getGradeLabel(score: number): string {
    const scoreInt = Math.floor(score);
    const labels: Record<number, string> = {
      10: 'Gem Mint',
      9: 'Mint',
      8: 'Near Mint / Mint',
      7: 'Near Mint',
      6: 'Excellent / Near Mint',
      5: 'Excellent',
      4: 'Very Good / Excellent',
      3: 'Very Good',
      2: 'Good',
      1: 'Poor',
    };
    return labels[scoreInt] || 'Unknown';
  }

  /**
   * Health check for ML service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<IMLHealthResponse>(
          `${this.mlServiceUrl}/health`,
          {
            timeout: 5000,
          },
        ),
      );
      return response.data.status === 'ok' && response.data.model_loaded;
    } catch (error) {
      this.logger.error(`ML service health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get ML model information
   */
  async getModelInfo(): Promise<IMLModelInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<IMLModelInfo>(
          `${this.mlServiceUrl}/model/info`,
          {
            timeout: 5000,
            headers: {
              'X-API-Key': this.apiKey,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch model info: ${error.message}`);
      throw new MlServiceUnavailableException('Cannot fetch model info');
    }
  }
}
