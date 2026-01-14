import { IGradeCriteria } from '../interfaces';

/**
 * Mapping d'un score brut vers l'echelle PCA stricte
 *
 * Regles PCA:
 * - Pas de demi-points sauf 9.5
 * - Arrondi inferieur strict (on est exigeant)
 * - Cas special: 10+ (Collector) si tous criteres = 10
 *
 * @param rawScore - Score brut calcule (ex: 7.3, 8.9, 9.5)
 * @param criteria - Criteres individuels (optionnel, pour determiner 10+)
 * @returns Score PCA valide (1-11, ou 11 = 10+)
 */
export function mapToPCAScale(
  rawScore: number,
  criteria?: IGradeCriteria,
): number {
  // Cas special: score parfait (10)
  if (rawScore >= 10) {
    // Si tous les criteres sont a 10 -> Grade 11 (10+ Collector)
    if (criteria && areAllCriteriaPerfect(criteria)) {
      return 11; // Valeur interne pour 10+
    }
    // Sinon -> Grade 10 (Neuf Sup)
    return 10;
  }

  // Cas special: zone 9.5 (Neuf)
  // Entre 9.5 et 9.99 -> 9.5
  if (rawScore >= 9.5) {
    return 9.5;
  }

  // Arrondi inferieur strict pour tout le reste
  // 7.3 -> 7, 8.9 -> 8, 9.2 -> 9, etc.
  const flooredGrade = Math.floor(rawScore);

  // Securite: minimum 1, maximum 9
  return Math.max(1, Math.min(9, flooredGrade));
}

/**
 * Verifie si tous les criteres sont parfaits (= 10)
 * Utilise pour determiner le grade 10+ (Collector)
 */
function areAllCriteriaPerfect(criteria: IGradeCriteria): boolean {
  return (
    criteria.centering === 10 &&
    criteria.corners === 10 &&
    criteria.edges === 10 &&
    criteria.surface === 10 &&
    criteria.printQuality === 10
  );
}

/**
 * Normalise un score individuel (critere) vers l'echelle PCA
 *
 * Regles:
 * - 10 reste 10
 * - 9.5-9.99 -> 9.5
 * - Sinon arrondi inferieur (5.9 -> 5, 7.3 -> 7)
 *
 * @param rawScore - Score brut du critere
 * @returns Score normalise (entier ou 9.5 ou 10)
 */
export function normalizeCriteriaScore(rawScore: number): number {
  if (rawScore >= 10) {
    return 10;
  }
  if (rawScore >= 9.5) {
    return 9.5;
  }
  return Math.max(1, Math.floor(rawScore));
}

/**
 * Normalise tous les criteres d'un objet IGradeCriteria
 * @param criteria - Criteres bruts
 * @returns Criteres normalises selon l'echelle PCA
 */
export function normalizeAllCriteria(criteria: IGradeCriteria): IGradeCriteria {
  return {
    centering: normalizeCriteriaScore(criteria.centering),
    corners: normalizeCriteriaScore(criteria.corners),
    edges: normalizeCriteriaScore(criteria.edges),
    surface: normalizeCriteriaScore(criteria.surface),
    printQuality: normalizeCriteriaScore(criteria.printQuality),
  };
}

/**
 * Validation stricte: verifie qu'un score respecte l'echelle PCA
 * @returns true si le score est une valeur PCA valide
 */
export function isValidPCAGrade(grade: number): boolean {
  const validGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 9.5, 10, 11];
  return validGrades.includes(grade);
}
