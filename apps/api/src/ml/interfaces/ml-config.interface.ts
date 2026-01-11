export interface IMLConfig {
  serviceUrl: string;
  timeout: number;
  maxRetries: number;
  enableFallback: boolean;
  apiKey: string;
}

export const ML_CONFIG_DEFAULTS: IMLConfig = {
  serviceUrl: 'http://localhost:5000',
  timeout: 30000,
  maxRetries: 3,
  enableFallback: true,
  apiKey: 'dev-api-key',
};
