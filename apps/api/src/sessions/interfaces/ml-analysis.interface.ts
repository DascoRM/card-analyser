export interface IMLAnalysisInput {
  frontImagePath: string;
  backImagePath: string;
  sessionId: string;
}

export interface IMLAnalysisOutput {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  confidence: number;
  modelVersion: string;
  rawData?: unknown;
}
