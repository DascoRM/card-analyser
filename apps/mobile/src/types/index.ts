export interface CardImage {
  uri: string;
  width: number;
  height: number;
}

export interface CardPhotos {
  front: CardImage | null;
  back: CardImage | null;
}

export interface GradingCriteria {
  borders: number; // 0-10
  defects: number; // 0-10
  centering: number; // 0-10
  cutQuality: number; // 0-10
}

export interface GradingResult {
  criteria: GradingCriteria;
  finalGrade: number; // 1-10
  details: {
    borders: string;
    defects: string;
    centering: string;
    cutQuality: string;
  };
  timestamp: number;
  photos: CardPhotos;
}

export interface ImageAnalysisResult {
  borders: {
    score: number;
    uniformity: number;
    thickness: number;
  };
  defects: {
    score: number;
    scratchCount: number;
    stainCount: number;
  };
  centering: {
    score: number;
    horizontalOffset: number;
    verticalOffset: number;
  };
  cutQuality: {
    score: number;
    edgeStraightness: number;
    cornerSharpness: number;
  };
}

export type NavigationParams = {
  Home: undefined;
  Camera: { side: 'front' | 'back'; existingPhotos?: CardPhotos };
  Analysis: { photos: CardPhotos };
  Results: { result: GradingResult };
};
