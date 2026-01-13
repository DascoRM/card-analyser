/**
 * Grade Scale Utilities - Mapping PCA/PSA grades to display
 *
 * Provides utilities to format grade results for display with:
 * - French labels for PCA scale
 * - English labels for PSA scale
 * - Support for 10+ (Collector) grade
 * - Half-point grades (9.5, 8.5, etc.)
 */

export interface GradeDisplay {
  score: number;
  displayScore: string;
  label: string;
  colorGradient: string;
}

/**
 * Formats a score without unnecessary decimals
 * - Integer scores: "10", "9", "8"
 * - Half-point scores: "9.5", "8.5"
 *
 * @param score - Numeric grade score
 * @returns Formatted score string
 */
function formatScoreDisplay(score: number): string {
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
}

/**
 * PCA grade scale with French labels
 * Note: 11 represents the special 10+ "Collector" grade
 */
export const PCA_GRADE_SCALE: Record<number, string> = {
  11: 'Collector',
  10: 'Neuf Sup',
  9: 'Proche du Neuf',
  8: 'Excellent - Proche du Neuf',
  7: 'Excellente',
  6: 'Tres Bon',
  5: 'Bon',
  4: 'Correct',
  3: 'Moyen',
  2: 'Mauvais',
  1: 'Tres Mauvais',
};

/**
 * PSA grade scale with English labels
 */
export const PSA_GRADE_SCALE: Record<number, string> = {
  10: 'Gem Mint 10',
  9: 'Mint 9',
  8: 'NM-MT 8',
  7: 'Near Mint 7',
  6: 'EX-MT 6',
  5: 'Excellent 5',
  4: 'VG-EX 4',
  3: 'Very Good 3',
  2: 'Good 2',
  1: 'Poor 1',
};

/**
 * Half-point labels for PCA scale
 */
const HALF_POINT_LABELS: Record<string, string> = {
  '9.5': 'Neuf',
  '8.5': 'Excellent +',
  '7.5': 'Excellente +',
  '6.5': 'Tres Bon +',
  '5.5': 'Bon +',
  '4.5': 'Correct +',
  '3.5': 'Moyen +',
  '2.5': 'Mauvais +',
  '1.5': 'Tres Mauvais +',
};

/**
 * Color gradients for each grade level
 */
const GRADE_COLORS: Record<number, string> = {
  11: 'from-yellow-300 via-amber-400 to-yellow-500', // Special Collector gradient
  10: 'from-yellow-400 to-amber-500',
  9: 'from-green-400 to-emerald-500',
  8: 'from-blue-400 to-blue-500',
  7: 'from-cyan-400 to-cyan-500',
  6: 'from-purple-400 to-purple-500',
  5: 'from-orange-400 to-orange-500',
  4: 'from-red-300 to-red-400',
  3: 'from-red-400 to-red-500',
  2: 'from-red-500 to-red-600',
  1: 'from-gray-400 to-gray-500',
};

interface GradeResultInput {
  finalGrade: number;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
}

/**
 * Determines if a result qualifies for Collector grade (10+)
 * A Collector grade requires all criteria to be perfect 10s
 *
 * @param result - Grade result with all criteria scores
 * @returns true if all criteria are 10
 */
export function isCollectorGrade(result: GradeResultInput): boolean {
  return (
    result.finalGrade === 10 &&
    result.centering === 10 &&
    result.corners === 10 &&
    result.edges === 10 &&
    result.surface === 10 &&
    result.printQuality === 10
  );
}

/**
 * Formats a grade result for PCA scale display
 *
 * @param result - Grade result with criteria scores
 * @param scale - Grade scale ('PCA' or 'PSA')
 * @returns Formatted grade display object
 *
 * @example
 * const collector = { finalGrade: 10, centering: 10, corners: 10, edges: 10, surface: 10, printQuality: 10 };
 * formatPCAGrade(collector, 'PCA');
 * // { score: 10, displayScore: '10+', label: 'Collector', colorGradient: '...' }
 */
export function formatPCAGrade(
  result: GradeResultInput,
  scale: 'PCA' | 'PSA'
): GradeDisplay {
  // Special case: Collector grade (10+)
  // Backend returns finalGrade: 11 for Collector, or we detect it from criteria
  if (scale === 'PCA' && (result.finalGrade === 11 || isCollectorGrade(result))) {
    return {
      score: 10,
      displayScore: '10+',
      label: 'Collector',
      colorGradient: GRADE_COLORS[11],
    };
  }

  const score = result.finalGrade;
  const scoreStr = formatScoreDisplay(score);

  // Check for half-point labels
  const halfPointLabel = HALF_POINT_LABELS[scoreStr];

  // Default label based on floor value
  const scoreInt = Math.floor(score);
  const defaultLabel = PCA_GRADE_SCALE[scoreInt] || 'Non classe';

  return {
    score,
    displayScore: scoreStr,
    label: halfPointLabel || defaultLabel,
    colorGradient: GRADE_COLORS[scoreInt] || GRADE_COLORS[5],
  };
}

/**
 * Formats a grade result for display (unified function for both scales)
 *
 * @param result - Grade result with criteria scores
 * @param scale - Grade scale ('PCA' or 'PSA')
 * @returns Formatted grade display object
 */
export function formatGrade(
  result: GradeResultInput,
  scale: 'PCA' | 'PSA'
): GradeDisplay {
  if (scale === 'PSA') {
    // PSA uses whole numbers only
    const scoreInt = Math.round(result.finalGrade);
    return {
      score: scoreInt,
      displayScore: scoreInt.toString(),
      label: PSA_GRADE_SCALE[scoreInt] || 'Not Graded',
      colorGradient: GRADE_COLORS[scoreInt] || GRADE_COLORS[5],
    };
  }

  // PCA with 10+ and half-point support
  return formatPCAGrade(result, scale);
}

/**
 * Gets the PCA label for a score
 *
 * @param score - Numeric grade score
 * @returns French label for the score
 */
export function getPCALabel(score: number): string {
  const scoreStr = formatScoreDisplay(score);
  const halfPointLabel = HALF_POINT_LABELS[scoreStr];

  if (halfPointLabel) {
    return halfPointLabel;
  }

  const scoreInt = Math.floor(score);
  return PCA_GRADE_SCALE[scoreInt] || 'Non classe';
}

/**
 * Gets the color gradient class for a score
 *
 * @param score - Numeric grade score
 * @param isCollector - Whether this is a Collector (10+) grade
 * @returns Tailwind gradient class
 */
export function getGradeColorGradient(
  score: number,
  isCollector: boolean = false
): string {
  if (isCollector) {
    return GRADE_COLORS[11];
  }
  const scoreInt = Math.floor(score);
  return GRADE_COLORS[scoreInt] || GRADE_COLORS[5];
}
