import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import { ImageAnalysisResult, CardImage, GradingCriteria, GradingResult, CardPhotos } from '../types';

/**
 * Analyzes card borders using edge detection simulation
 * In a real implementation, this would use actual edge detection algorithms
 */
async function analyzeBorders(imageUri: string): Promise<{ score: number; uniformity: number; thickness: number }> {
  try {
    // Simulate border analysis
    // In production, you'd analyze actual pixel data for border uniformity
    const uniformity = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const thickness = Math.random() * 0.2 + 0.8; // 0.8-1.0

    // Score based on uniformity and thickness consistency
    const score = (uniformity * 0.6 + thickness * 0.4) * 10;

    return {
      score: Math.round(score * 10) / 10,
      uniformity: Math.round(uniformity * 100),
      thickness: Math.round(thickness * 100)
    };
  } catch (error) {
    console.error('Border analysis error:', error);
    return { score: 5, uniformity: 50, thickness: 50 };
  }
}

/**
 * Analyzes surface defects using contrast and variance detection
 */
async function analyzeDefects(imageUri: string): Promise<{ score: number; scratchCount: number; stainCount: number }> {
  try {
    // Simulate defect detection
    // In production, analyze pixel variance, sudden contrast changes
    const scratchCount = Math.floor(Math.random() * 3); // 0-2 scratches
    const stainCount = Math.floor(Math.random() * 2); // 0-1 stains

    // Higher defect count = lower score
    const defectPenalty = (scratchCount * 0.15) + (stainCount * 0.25);
    const score = Math.max(1, 10 - (defectPenalty * 10));

    return {
      score: Math.round(score * 10) / 10,
      scratchCount,
      stainCount
    };
  } catch (error) {
    console.error('Defect analysis error:', error);
    return { score: 5, scratchCount: 0, stainCount: 0 };
  }
}

/**
 * Analyzes card centering using symmetry detection
 */
async function analyzeCentering(imageUri: string): Promise<{ score: number; horizontalOffset: number; verticalOffset: number }> {
  try {
    // Simulate centering analysis
    // In production, detect card edges and measure distances from center
    const horizontalOffset = Math.random() * 10 - 5; // -5% to +5%
    const verticalOffset = Math.random() * 10 - 5; // -5% to +5%

    // Perfect centering = 0 offset, score decreases with offset
    const totalOffset = Math.abs(horizontalOffset) + Math.abs(verticalOffset);
    const score = Math.max(1, 10 - totalOffset);

    return {
      score: Math.round(score * 10) / 10,
      horizontalOffset: Math.round(horizontalOffset * 10) / 10,
      verticalOffset: Math.round(verticalOffset * 10) / 10
    };
  } catch (error) {
    console.error('Centering analysis error:', error);
    return { score: 5, horizontalOffset: 0, verticalOffset: 0 };
  }
}

/**
 * Analyzes cut quality using edge straightness detection
 */
async function analyzeCutQuality(imageUri: string): Promise<{ score: number; edgeStraightness: number; cornerSharpness: number }> {
  try {
    // Simulate cut quality analysis
    // In production, analyze edge lines for deviation from straight line
    const edgeStraightness = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const cornerSharpness = Math.random() * 0.3 + 0.7; // 0.7-1.0

    // Score based on straightness and corner quality
    const score = (edgeStraightness * 0.5 + cornerSharpness * 0.5) * 10;

    return {
      score: Math.round(score * 10) / 10,
      edgeStraightness: Math.round(edgeStraightness * 100),
      cornerSharpness: Math.round(cornerSharpness * 100)
    };
  } catch (error) {
    console.error('Cut quality analysis error:', error);
    return { score: 5, edgeStraightness: 50, cornerSharpness: 50 };
  }
}

/**
 * Processes and analyzes a single card image
 */
async function analyzeCardImage(image: CardImage): Promise<ImageAnalysisResult> {
  // Run all analyses in parallel for better performance
  const [borders, defects, centering, cutQuality] = await Promise.all([
    analyzeBorders(image.uri),
    analyzeDefects(image.uri),
    analyzeCentering(image.uri),
    analyzeCutQuality(image.uri)
  ]);

  return {
    borders,
    defects,
    centering,
    cutQuality
  };
}

/**
 * Combines analysis from front and back images
 */
function combineAnalyses(frontAnalysis: ImageAnalysisResult, backAnalysis: ImageAnalysisResult): ImageAnalysisResult {
  return {
    borders: {
      score: (frontAnalysis.borders.score + backAnalysis.borders.score) / 2,
      uniformity: (frontAnalysis.borders.uniformity + backAnalysis.borders.uniformity) / 2,
      thickness: (frontAnalysis.borders.thickness + backAnalysis.borders.thickness) / 2
    },
    defects: {
      score: (frontAnalysis.defects.score + backAnalysis.defects.score) / 2,
      scratchCount: frontAnalysis.defects.scratchCount + backAnalysis.defects.scratchCount,
      stainCount: frontAnalysis.defects.stainCount + backAnalysis.defects.stainCount
    },
    centering: {
      score: (frontAnalysis.centering.score + backAnalysis.centering.score) / 2,
      horizontalOffset: (frontAnalysis.centering.horizontalOffset + backAnalysis.centering.horizontalOffset) / 2,
      verticalOffset: (frontAnalysis.centering.verticalOffset + backAnalysis.centering.verticalOffset) / 2
    },
    cutQuality: {
      score: (frontAnalysis.cutQuality.score + backAnalysis.cutQuality.score) / 2,
      edgeStraightness: (frontAnalysis.cutQuality.edgeStraightness + backAnalysis.cutQuality.edgeStraightness) / 2,
      cornerSharpness: (frontAnalysis.cutQuality.cornerSharpness + backAnalysis.cutQuality.cornerSharpness) / 2
    }
  };
}

/**
 * Generates human-readable details for each criterion
 */
function generateDetails(analysis: ImageAnalysisResult): GradingResult['details'] {
  return {
    borders: `Uniformity: ${Math.round(analysis.borders.uniformity)}%, Thickness: ${Math.round(analysis.borders.thickness)}%`,
    defects: `Scratches: ${analysis.defects.scratchCount}, Stains: ${analysis.defects.stainCount}`,
    centering: `H-Offset: ${analysis.centering.horizontalOffset.toFixed(1)}%, V-Offset: ${analysis.centering.verticalOffset.toFixed(1)}%`,
    cutQuality: `Edge: ${Math.round(analysis.cutQuality.edgeStraightness)}%, Corners: ${Math.round(analysis.cutQuality.cornerSharpness)}%`
  };
}

/**
 * Calculates final PCA grade (1-10) based on weighted criteria
 */
function calculateFinalGrade(criteria: GradingCriteria): number {
  // Weighted average: borders 25%, defects 30%, centering 25%, cut 20%
  const weighted = (
    criteria.borders * 0.25 +
    criteria.defects * 0.30 +
    criteria.centering * 0.25 +
    criteria.cutQuality * 0.20
  );

  // Round to nearest 0.5 and ensure it's between 1-10
  const grade = Math.round(weighted * 2) / 2;
  return Math.max(1, Math.min(10, grade));
}

/**
 * Main function to grade a Pokemon card
 */
export async function gradeCard(photos: CardPhotos): Promise<GradingResult> {
  if (!photos.front || !photos.back) {
    throw new Error('Both front and back photos are required');
  }

  // Analyze both images
  const [frontAnalysis, backAnalysis] = await Promise.all([
    analyzeCardImage(photos.front),
    analyzeCardImage(photos.back)
  ]);

  // Combine analyses
  const combinedAnalysis = combineAnalyses(frontAnalysis, backAnalysis);

  // Extract scores for each criterion
  const criteria: GradingCriteria = {
    borders: Math.round(combinedAnalysis.borders.score * 10) / 10,
    defects: Math.round(combinedAnalysis.defects.score * 10) / 10,
    centering: Math.round(combinedAnalysis.centering.score * 10) / 10,
    cutQuality: Math.round(combinedAnalysis.cutQuality.score * 10) / 10
  };

  // Calculate final grade
  const finalGrade = calculateFinalGrade(criteria);

  // Generate details
  const details = generateDetails(combinedAnalysis);

  return {
    criteria,
    finalGrade,
    details,
    timestamp: Date.now(),
    photos
  };
}

/**
 * Preprocesses image for better analysis (resize, normalize)
 */
export async function preprocessImage(imageUri: string): Promise<string> {
  try {
    const manipResult = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 1000 } } // Resize to standard width for consistent analysis
      ],
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return imageUri; // Return original if preprocessing fails
  }
}
