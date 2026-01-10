import { GradeScale } from '../enums';

export interface IGradeCriteria {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
}

export interface IGradeResult {
  scale: GradeScale;
  criteria: IGradeCriteria;
  finalGrade: number;
  gradeLabel: string;
  confidence?: number;
}
