export enum GradeScale {
  PCA = 'PCA',
  PSA = 'PSA',
}

/**
 * Mapping des notes PCA vers les labels français
 * Note: 11 représente le grade 10+ "Collector"
 */
export const PCA_GRADE_LABELS: Record<number, string> = {
  11: 'Collector',                    // Grade 10+ (tous critères parfaits)
  10: 'Neuf Sup',
  9.5: 'Neuf',
  9: 'Proche du Neuf',
  8: 'Excellent - Proche du Neuf',
  7: 'Excellente',
  6: 'Très Bon',
  5: 'Bon',
  4: 'Correct',
  3: 'Moyen',
  2: 'Mauvais',
  1: 'Très Mauvais',
};

/**
 * Mapping des notes PSA vers les labels anglais (rétrocompatibilité)
 */
export const PSA_GRADE_LABELS: Record<number, string> = {
  10: 'Gem Mint',
  9: 'Mint',
  8: 'Near Mint / Mint',
  7: 'Near Mint',
  6: 'Excellent',
  5: 'Very Good',
  4: 'Good',
  3: 'Fair',
  2: 'Poor',
  1: 'Damaged',
};

/**
 * Alias pour rétrocompatibilité (utilise PSA par défaut)
 * @deprecated Utiliser getGradeLabelForScale() à la place
 */
export const GRADE_LABELS = PSA_GRADE_LABELS;

/**
 * Récupère le label de note selon l'échelle
 * @param grade - Note finale (1-11, où 11 = 10+)
 * @param scale - Échelle de notation (PCA ou PSA)
 * @returns Label textuel de la note
 */
export function getGradeLabelForScale(
  grade: number,
  scale: GradeScale,
): string {
  const labels = scale === GradeScale.PCA ? PCA_GRADE_LABELS : PSA_GRADE_LABELS;

  // Chercher une correspondance exacte d'abord (pour les .5)
  if (labels[grade] !== undefined) {
    return labels[grade];
  }

  // Sinon arrondir vers le bas pour trouver le label le plus proche
  const keys = Object.keys(labels)
    .map(Number)
    .sort((a, b) => b - a);

  for (const key of keys) {
    if (grade >= key) {
      return labels[key];
    }
  }

  return labels[1] || 'Non classé';
}
