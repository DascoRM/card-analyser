// Types alignés avec l'API NestJS

export type SessionStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ARCHIVED';

export type CardSide = 'FRONT' | 'BACK';
export type GradeScale = 'PCA' | 'PSA';

export interface Session {
  id: string;
  userId: number;
  cardName?: string;
  cardSet?: string;
  cardYear?: number;
  cardType?: string;
  cardNumber?: string;
  cardRarity?: string;
  cardArtist?: string;
  cardImageUrl?: string;
  identificationConfidence?: number;
  identificationMethod?: string;
  pokemonTcgApiId?: string;
  status: SessionStatus;
  images: SessionImage[];
  gradeResults: GradeResult[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SessionImage {
  id: string;
  sessionId: string;
  side: CardSide;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface GradeResult {
  id: string;
  sessionId: string;
  scale: GradeScale;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  finalGrade: number;
  gradeLabel: string;
  confidence?: number;
  modelVersion?: string;
  method?: string;
  createdAt: string;
}

export interface CreateSessionDto {
  userId: number;
  cardName?: string;
  cardSet?: string;
  cardYear?: number;
  cardType?: string;
}

export interface AnalyzeSessionDto {
  scale: GradeScale;
}

// Feedback types
export interface GradeFeedback {
  id: string;
  resultId: string;
  userId: number;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  comment?: string;
  createdAt: string;
}

export interface SubmitFeedbackDto {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  comment?: string;
}

// Card Identification types
export interface CardIdentification {
  cardName: string;
  cardSet?: string;
  cardYear?: number;
  cardNumber?: string;
  cardType?: string;
  cardRarity?: string;
  cardArtist?: string;
  cardImageUrl?: string;
  confidence: number;
  method: 'ocr' | 'manual' | 'api' | 'ocr-partial';
  extractedText?: string[];
  apiId?: string;
}

export interface UpdateCardInfoDto {
  cardName?: string;
  cardSet?: string;
  cardYear?: number;
  cardType?: string;
}

export interface CardSearchResult {
  id: string;
  name: string;
  set: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  releaseDate?: string;
}
