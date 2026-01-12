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
  finalGrade: number;
  gradeLabel: string;
  confidence: number;
  modelVersion: string;
  method: string;
  rawData?: Record<string, unknown>;
}

export interface IMLHealthResponse {
  status: string;
  model_loaded: boolean;
  version: string;
  timestamp: number;
}

export interface IMLModelInfo {
  version: string;
  lastUpdated: string;
  method: string;
  description: string;
}
