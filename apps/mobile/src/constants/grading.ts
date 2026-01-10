/**
 * Grading constants and thresholds
 */

export const GRADE_SCALE = {
  GEM_MINT: { min: 10, max: 10, label: 'Gem Mint' },
  MINT_PLUS: { min: 9.5, max: 9.5, label: 'Mint+' },
  MINT: { min: 9, max: 9, label: 'Mint' },
  NEAR_MINT_MINT: { min: 8.5, max: 8.5, label: 'Near Mint/Mint+' },
  NEAR_MINT_PLUS: { min: 8, max: 8, label: 'Near Mint+' },
  NEAR_MINT: { min: 7.5, max: 7.5, label: 'Near Mint' },
  EXCELLENT_MINT: { min: 7, max: 7, label: 'Excellent/Mint' },
  EXCELLENT_PLUS: { min: 6.5, max: 6.5, label: 'Excellent+' },
  EXCELLENT: { min: 6, max: 6, label: 'Excellent' },
  VERY_GOOD_EXCELLENT: { min: 5.5, max: 5.5, label: 'Very Good/Excellent' },
  VERY_GOOD_PLUS: { min: 5, max: 5, label: 'Very Good+' },
  VERY_GOOD: { min: 4.5, max: 4.5, label: 'Very Good' },
  GOOD_PLUS: { min: 4, max: 4, label: 'Good+' },
  GOOD: { min: 3.5, max: 3.5, label: 'Good' },
  FAIR: { min: 3, max: 3, label: 'Fair' },
  POOR: { min: 1, max: 2.5, label: 'Poor' },
} as const;

export const CRITERIA_WEIGHTS = {
  BORDERS: 0.25,
  DEFECTS: 0.30,
  CENTERING: 0.25,
  CUT_QUALITY: 0.20,
} as const;

export const DEFECT_PENALTIES = {
  SCRATCH_MINOR: 0.5,
  SCRATCH_MAJOR: 1.0,
  STAIN_MINOR: 0.75,
  STAIN_MAJOR: 1.5,
  CREASE: 2.0,
  EDGE_WEAR: 0.5,
} as const;

export const CENTERING_TOLERANCES = {
  GEM_MINT: 0.5, // 0.5% max offset
  MINT: 1.0,
  NEAR_MINT: 2.0,
  EXCELLENT: 3.0,
  VERY_GOOD: 5.0,
  GOOD: 7.5,
  POOR: 10.0,
} as const;

export const BORDER_THRESHOLDS = {
  UNIFORMITY_MIN: 95, // 95% minimum uniformity for top grades
  THICKNESS_TOLERANCE: 5, // 5% variation allowed
} as const;

export const CUT_QUALITY_THRESHOLDS = {
  EDGE_STRAIGHTNESS_MIN: 95, // 95% minimum for top grades
  CORNER_SHARPNESS_MIN: 90, // 90% minimum for corners
} as const;

/**
 * Get grade label from numeric score
 */
export function getGradeLabel(grade: number): string {
  if (grade >= 10) return 'Gem Mint';
  if (grade >= 9.5) return 'Mint+';
  if (grade >= 9) return 'Mint';
  if (grade >= 8.5) return 'Near Mint/Mint+';
  if (grade >= 8) return 'Near Mint+';
  if (grade >= 7.5) return 'Near Mint';
  if (grade >= 7) return 'Excellent/Mint';
  if (grade >= 6.5) return 'Excellent+';
  if (grade >= 6) return 'Excellent';
  if (grade >= 5.5) return 'Very Good/Excellent';
  if (grade >= 5) return 'Very Good+';
  if (grade >= 4.5) return 'Very Good';
  if (grade >= 4) return 'Good+';
  if (grade >= 3.5) return 'Good';
  if (grade >= 3) return 'Fair';
  return 'Poor';
}

/**
 * Get color for grade visualization
 */
export function getGradeColor(grade: number): string {
  if (grade >= 9) return '#4CAF50'; // Green - Excellent
  if (grade >= 7.5) return '#8BC34A'; // Light Green - Very Good
  if (grade >= 6) return '#FFC107'; // Amber - Good
  if (grade >= 4) return '#FF9800'; // Orange - Fair
  return '#F44336'; // Red - Poor
}

/**
 * Get description for criterion score
 */
export function getCriterionDescription(criterion: string, score: number): string {
  const category = score >= 9 ? 'excellent' : score >= 7 ? 'good' : score >= 5 ? 'acceptable' : 'poor';

  const descriptions: Record<string, Record<string, string>> = {
    borders: {
      excellent: 'Borders are uniform and well-defined',
      good: 'Borders show minor irregularities',
      acceptable: 'Borders have noticeable variations',
      poor: 'Borders are significantly irregular',
    },
    defects: {
      excellent: 'Surface is pristine with no visible defects',
      good: 'Minor surface imperfections present',
      acceptable: 'Noticeable scratches or marks',
      poor: 'Multiple visible defects and wear',
    },
    centering: {
      excellent: 'Image is perfectly centered',
      good: 'Image shows slight offset',
      acceptable: 'Image centering is noticeably off',
      poor: 'Image is significantly off-center',
    },
    cutQuality: {
      excellent: 'Edges are straight with sharp corners',
      good: 'Edges show minor imperfections',
      acceptable: 'Cut quality shows noticeable issues',
      poor: 'Poor cutting with rough edges',
    },
  };

  return descriptions[criterion]?.[category] || '';
}
