"""
Rule-Based Card Grader.

Implements grading logic based on official PCA/PSA/BGS standards:
- Centering: Border ratio analysis
- Corners: Whitening and sharpness detection
- Edges: Whitening detection
- Surface: Scratch and crease detection
- Print Quality: Factory defect detection

Final grade = minimum of all sub-grades (PCA/PSA standard)
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from preprocessing.card_detector import CardDetector
from preprocessing.defect_detector import DefectDetector


class RuleBasedGrader:
    """
    Rule-based card grading engine.

    Uses computer vision and official grading rules to produce
    deterministic, explainable grades.
    """

    def __init__(self):
        """Initialize the grader with detection components."""
        self.card_detector = CardDetector()
        self.defect_detector = DefectDetector()
        self.version = "rule-based-v1.0.0"

    def grade_card(
        self,
        front_image: np.ndarray,
        back_image: np.ndarray
    ) -> Dict:
        """
        Grade a card using rule-based analysis.

        Args:
            front_image: BGR image of card front
            back_image: BGR image of card back

        Returns:
            Complete grading result with scores and details
        """
        # 1. Detect and extract cards
        front_card = self.card_detector.extract_card(front_image)
        back_card = self.card_detector.extract_card(back_image)

        # 2. Analyze each grading criterion
        centering_result = self._grade_centering(front_card, back_card)
        corners_result = self._grade_corners(front_card, back_card)
        edges_result = self._grade_edges(front_card, back_card)
        surface_result = self._grade_surface(front_card, back_card)
        print_quality_result = self._grade_print_quality(front_card)

        # 3. Calculate final grade (minimum of all sub-grades - PCA/PSA standard)
        sub_scores = [
            centering_result['score'],
            corners_result['score'],
            edges_result['score'],
            surface_result['score'],
            print_quality_result['score']
        ]
        final_grade = min(sub_scores)

        # 4. Calculate confidence based on image quality and detection certainty
        confidence = self._calculate_confidence(
            front_image, back_image,
            front_card, back_card
        )

        return {
            'final_grade': round(final_grade, 1),
            'grade_label': self._get_grade_label(final_grade),
            'centering': centering_result['score'],
            'corners': corners_result['score'],
            'edges': edges_result['score'],
            'surface': surface_result['score'],
            'printQuality': print_quality_result['score'],
            'confidence': confidence,
            'modelVersion': self.version,
            'details': {
                'centering': centering_result,
                'corners': corners_result,
                'edges': edges_result,
                'surface': surface_result,
                'print_quality': print_quality_result
            },
            'method': 'rule_based'
        }

    def _grade_centering(
        self,
        front_card: np.ndarray,
        back_card: np.ndarray
    ) -> Dict:
        """
        Grade centering based on border ratios.

        Official standards (CGC/Beckett):
        - 10: 55/45 or better on both axes
        - 9: 60/40 or better
        - 8: 65/35 or better
        - 7: 70/30 or better
        - 6: 75/25 or better
        - Below 6: Worse than 75/25
        """
        # Measure borders on front
        front_borders = self.card_detector.measure_borders(front_card)

        # Calculate ratios
        left = front_borders['left']
        right = front_borders['right']
        top = front_borders['top']
        bottom = front_borders['bottom']

        # Avoid division by zero
        h_min = max(min(left, right), 0.1)
        h_max = max(left, right)
        v_min = max(min(top, bottom), 0.1)
        v_max = max(top, bottom)

        h_ratio = h_max / h_min
        v_ratio = v_max / v_min

        # Calculate ratio strings
        h_total = left + right
        v_total = top + bottom

        if h_total > 0:
            h_smaller = int(100 * min(left, right) / h_total)
            h_larger = 100 - h_smaller
            h_ratio_str = f"{h_smaller}/{h_larger}"
        else:
            h_ratio_str = "50/50"

        if v_total > 0:
            v_smaller = int(100 * min(top, bottom) / v_total)
            v_larger = 100 - v_smaller
            v_ratio_str = f"{v_smaller}/{v_larger}"
        else:
            v_ratio_str = "50/50"

        # Apply official rules
        max_ratio = max(h_ratio, v_ratio)

        if max_ratio <= 1.22:  # 55/45
            score = 10
        elif max_ratio <= 1.5:  # 60/40
            score = 9
        elif max_ratio <= 1.86:  # 65/35
            score = 8
        elif max_ratio <= 2.33:  # 70/30
            score = 7
        elif max_ratio <= 3.0:  # 75/25
            score = 6
        else:
            # Degrade further for very off-center cards
            score = max(1, 5 - int((max_ratio - 3) / 2))

        return {
            'score': float(score),
            'horizontal_ratio': h_ratio_str,
            'vertical_ratio': v_ratio_str,
            'borders': {
                'left': round(left, 1),
                'right': round(right, 1),
                'top': round(top, 1),
                'bottom': round(bottom, 1)
            },
            'defects': [] if score >= 8 else ['off_center']
        }

    def _grade_corners(
        self,
        front_card: np.ndarray,
        back_card: np.ndarray
    ) -> Dict:
        """
        Grade corners based on whitening and sharpness.

        The worst corner determines the score (PCA/PSA standard).
        """
        # Extract corners from front
        corners_front = self.card_detector.extract_corners(front_card)
        corners_back = self.card_detector.extract_corners(back_card)

        positions = ['top_left', 'top_right', 'bottom_left', 'bottom_right']

        # Analyze all 8 corners (4 front + 4 back)
        all_corner_results = []

        for i, (front_corner, back_corner) in enumerate(zip(corners_front, corners_back)):
            # Analyze front corner
            front_result = self.defect_detector.analyze_corner(
                front_corner, f"front_{positions[i]}"
            )
            all_corner_results.append(front_result)

            # Analyze back corner
            back_result = self.defect_detector.analyze_corner(
                back_corner, f"back_{positions[i]}"
            )
            all_corner_results.append(back_result)

        # Find worst corner score
        worst_score = min(c['score'] for c in all_corner_results)

        # Collect all defects
        all_defects = []
        for corner in all_corner_results:
            all_defects.extend(corner['defects'])

        return {
            'score': float(worst_score),
            'corners': all_corner_results,
            'worst_corner': min(all_corner_results, key=lambda x: x['score'])['position'],
            'defects': list(set(all_defects))
        }

    def _grade_edges(
        self,
        front_card: np.ndarray,
        back_card: np.ndarray
    ) -> Dict:
        """
        Grade edges based on whitening.

        The worst edge determines the score.
        """
        # Extract edges
        edges_front = self.card_detector.extract_edges(front_card)
        edges_back = self.card_detector.extract_edges(back_card)

        positions = ['top', 'right', 'bottom', 'left']

        # Analyze all 8 edges
        all_edge_results = []

        for i, (front_edge, back_edge) in enumerate(zip(edges_front, edges_back)):
            front_result = self.defect_detector.analyze_edge(
                front_edge, f"front_{positions[i]}"
            )
            all_edge_results.append(front_result)

            back_result = self.defect_detector.analyze_edge(
                back_edge, f"back_{positions[i]}"
            )
            all_edge_results.append(back_result)

        # Find worst edge score
        worst_score = min(e['score'] for e in all_edge_results)

        # Collect all defects
        all_defects = []
        for edge in all_edge_results:
            all_defects.extend(edge['defects'])

        return {
            'score': float(worst_score),
            'edges': all_edge_results,
            'worst_edge': min(all_edge_results, key=lambda x: x['score'])['position'],
            'defects': list(set(all_defects))
        }

    def _grade_surface(
        self,
        front_card: np.ndarray,
        back_card: np.ndarray
    ) -> Dict:
        """
        Grade surface based on scratches and creases.
        """
        result = self.defect_detector.analyze_surface(front_card, back_card)
        return result

    def _grade_print_quality(self, front_card: np.ndarray) -> Dict:
        """
        Grade print quality (factory defects only).
        """
        result = self.defect_detector.analyze_print_quality(front_card)
        return result

    def _calculate_confidence(
        self,
        front_orig: np.ndarray,
        back_orig: np.ndarray,
        front_card: np.ndarray,
        back_card: np.ndarray
    ) -> float:
        """
        Calculate confidence score based on image quality.

        STABLE VERSION (v1.0.0):
        Applies a penalty factor to reflect rule-based system limitations.

        Factors:
        - Image sharpness (blur detection)
        - Lighting (brightness analysis)
        - Card detection success
        - System limitations penalty (0.85 factor)
        """
        # Check if card was detected (vs using full image)
        front_detected = front_card.shape != front_orig.shape
        back_detected = back_card.shape != back_orig.shape

        detection_score = 1.0 if (front_detected and back_detected) else 0.6

        # Analyze image quality
        front_quality = self._assess_image_quality(front_orig)
        back_quality = self._assess_image_quality(back_orig)

        quality_score = (front_quality + back_quality) / 2

        # Base confidence from detection and quality
        base_confidence = detection_score * 0.4 + quality_score * 0.6

        # Apply penalty for rule-based system limitations
        # Until ML model is trained, we use simplified printQuality detection
        method_penalty = 0.85

        confidence = base_confidence * method_penalty

        return round(confidence, 3)

    def _assess_image_quality(self, image: np.ndarray) -> float:
        """
        Assess image quality for confidence adjustment.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Blur detection (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(laplacian_var / 500, 1.0)

        # Brightness analysis
        brightness = np.mean(gray) / 255.0
        brightness_score = 1.0 - abs(brightness - 0.5) * 2
        brightness_score = max(0, brightness_score)

        # Resolution check
        height, width = image.shape[:2]
        resolution_score = min((width * height) / (1920 * 1080), 1.0)

        # Combined quality
        return (blur_score * 0.4 + brightness_score * 0.3 + resolution_score * 0.3)

    @staticmethod
    def _get_grade_label(score: float) -> str:
        """
        Get the official grade label for a score.

        Labels based on PSA/PCA standards.
        """
        score_int = int(score)
        labels = {
            10: "Gem Mint",
            9: "Mint",
            8: "Near Mint / Mint",
            7: "Near Mint",
            6: "Excellent / Near Mint",
            5: "Excellent",
            4: "Very Good / Excellent",
            3: "Very Good",
            2: "Good",
            1: "Poor"
        }
        return labels.get(score_int, "Unknown")


# Convenience function for direct use
async def grade_card_from_paths(
    front_path: str,
    back_path: str
) -> Dict:
    """
    Grade a card from file paths.

    Args:
        front_path: Path to front image
        back_path: Path to back image

    Returns:
        Grading result
    """
    front_image = cv2.imread(front_path)
    back_image = cv2.imread(back_path)

    if front_image is None:
        raise FileNotFoundError(f"Could not load front image: {front_path}")
    if back_image is None:
        raise FileNotFoundError(f"Could not load back image: {back_path}")

    grader = RuleBasedGrader()
    return grader.grade_card(front_image, back_image)
