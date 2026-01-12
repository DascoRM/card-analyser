"""
Defect Detection for Card Grading.

Detects various defects on cards:
- Whitening on corners and edges
- Scratches on surface
- Corner sharpness (rounding)
- Creases and folds
- Print defects
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple


class DefectDetector:
    """
    Detects and quantifies defects on trading cards.
    """

    def __init__(self):
        """Initialize the defect detector."""
        pass

    def detect_whitening(self, region: np.ndarray) -> float:
        """
        Detect whitening (white pixels) on corners or edges.

        Whitening is a common defect where the card material
        shows through damaged areas.

        Args:
            region: BGR image of corner or edge

        Returns:
            Percentage of whitening (0-100)
        """
        if region is None or region.size == 0:
            return 0.0

        # Convert to HSV for better white detection
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)

        # White detection: low saturation, high value
        # H: any, S: 0-40, V: 200-255
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 40, 255])

        white_mask = cv2.inRange(hsv, lower_white, upper_white)

        # Calculate percentage
        total_pixels = region.shape[0] * region.shape[1]
        white_pixels = np.sum(white_mask > 0)

        percentage = (white_pixels / total_pixels) * 100

        return round(percentage, 2)

    def detect_corner_sharpness(self, corner: np.ndarray) -> float:
        """
        Measure corner sharpness (detect rounding).

        Sharp corners = high score, rounded corners = low score.

        Args:
            corner: BGR image of corner region

        Returns:
            Sharpness score (0-100), 100 = perfectly sharp
        """
        if corner is None or corner.size == 0:
            return 50.0

        # Convert to grayscale
        gray = cv2.cvtColor(corner, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        # Harris corner detection
        harris = cv2.cornerHarris(blurred.astype(np.float32), 2, 3, 0.04)

        # Normalize harris response
        harris_normalized = cv2.normalize(harris, None, 0, 255, cv2.NORM_MINMAX)

        # Check for strong corner response in the actual corner area
        h, w = corner.shape[:2]
        corner_region = harris_normalized[0:h//3, 0:w//3]  # Analyze corner area

        max_response = corner_region.max()

        # Also check gradient magnitude at corner
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(grad_x**2 + grad_y**2)

        corner_gradient = gradient_mag[0:h//3, 0:w//3].mean()

        # Combine metrics
        # Normalize to 0-100 scale
        harris_score = min(max_response / 2.55, 100)  # Scale from 0-255 to 0-100
        gradient_score = min(corner_gradient / 2, 100)  # Normalize gradient

        sharpness = (harris_score * 0.6 + gradient_score * 0.4)

        return round(sharpness, 1)

    def detect_scratches(self, surface: np.ndarray) -> Dict[str, any]:
        """
        Detect scratches on card surface using line detection.

        Args:
            surface: BGR image of card surface

        Returns:
            Dictionary with scratch count and severity
        """
        if surface is None or surface.size == 0:
            return {'count': 0, 'severity': 0.0, 'lines': []}

        # Convert to grayscale
        gray = cv2.cvtColor(surface, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)

        # Probabilistic Hough Line Transform
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=50,
            minLineLength=20,
            maxLineGap=5
        )

        if lines is None:
            return {'count': 0, 'severity': 0.0, 'lines': []}

        # Filter lines that look like scratches (long, thin)
        scratch_lines = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)

            # Scratches are typically longer than 30 pixels
            if length > 30:
                scratch_lines.append({
                    'start': (x1, y1),
                    'end': (x2, y2),
                    'length': length
                })

        # Calculate severity based on total scratch length
        total_length = sum(s['length'] for s in scratch_lines)
        surface_diagonal = np.sqrt(surface.shape[0]**2 + surface.shape[1]**2)

        severity = min((total_length / surface_diagonal) * 10, 100)

        return {
            'count': len(scratch_lines),
            'severity': round(severity, 2),
            'lines': scratch_lines
        }

    def detect_creases(self, surface: np.ndarray) -> Dict[str, any]:
        """
        Detect creases and folds on card surface.

        Args:
            surface: BGR image of card surface

        Returns:
            Dictionary with crease detection results
        """
        if surface is None or surface.size == 0:
            return {'detected': False, 'count': 0, 'severity': 0.0}

        # Convert to grayscale
        gray = cv2.cvtColor(surface, cv2.COLOR_BGR2GRAY)

        # Apply bilateral filter to reduce noise while keeping edges
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)

        # Detect long edges that could be creases
        edges = cv2.Canny(filtered, 30, 100)

        # Look for long continuous lines (creases are typically straight)
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=100,  # Higher threshold for creases
            minLineLength=50,  # Creases are longer
            maxLineGap=10
        )

        if lines is None:
            return {'detected': False, 'count': 0, 'severity': 0.0}

        # Filter for crease-like lines (long, straight)
        crease_count = 0
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            if length > 100:  # Very long lines are likely creases
                crease_count += 1

        severity = min(crease_count * 20, 100)

        return {
            'detected': crease_count > 0,
            'count': crease_count,
            'severity': round(severity, 2)
        }

    def detect_print_defects(self, surface: np.ndarray) -> Dict[str, any]:
        """
        Detect print defects (ink dots, color issues).

        Args:
            surface: BGR image of card surface

        Returns:
            Dictionary with print defect analysis
        """
        if surface is None or surface.size == 0:
            return {'ink_dots': 0, 'color_issues': False, 'severity': 0.0}

        # Convert to LAB color space for better color analysis
        lab = cv2.cvtColor(surface, cv2.COLOR_BGR2LAB)

        # Detect ink dots (small dark spots)
        gray = cv2.cvtColor(surface, cv2.COLOR_BGR2GRAY)

        # Threshold for dark spots
        _, dark_thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY_INV)

        # Find contours of dark spots
        contours, _ = cv2.findContours(
            dark_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Count small spots (ink dots)
        ink_dots = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if 5 < area < 50:  # Small spots
                ink_dots += 1

        # Check for color uniformity issues
        # Calculate standard deviation in each LAB channel
        l_std = np.std(lab[:, :, 0])
        a_std = np.std(lab[:, :, 1])
        b_std = np.std(lab[:, :, 2])

        # High variance might indicate color bleeding or misprints
        color_variance = (l_std + a_std + b_std) / 3
        color_issues = color_variance > 50

        # Calculate severity
        severity = min(ink_dots * 5 + (20 if color_issues else 0), 100)

        return {
            'ink_dots': ink_dots,
            'color_issues': color_issues,
            'color_variance': round(color_variance, 2),
            'severity': round(severity, 2)
        }

    def analyze_corner(self, corner: np.ndarray, position: str) -> Dict[str, any]:
        """
        Complete analysis of a corner.

        Args:
            corner: BGR image of corner
            position: Corner position ('top_left', 'top_right', etc.)

        Returns:
            Complete corner analysis
        """
        whitening = self.detect_whitening(corner)
        sharpness = self.detect_corner_sharpness(corner)

        # Calculate corner score (1-10)
        # Perfect corner: 0% whitening, 100% sharpness
        whitening_penalty = min(whitening / 2, 5)  # Max 5 point penalty
        sharpness_penalty = max(0, (100 - sharpness) / 20)  # Max 5 point penalty

        score = max(1, 10 - whitening_penalty - sharpness_penalty)

        return {
            'position': position,
            'score': round(score, 1),
            'whitening_percent': whitening,
            'sharpness': sharpness,
            'defects': self._list_corner_defects(whitening, sharpness)
        }

    def analyze_edge(self, edge: np.ndarray, position: str) -> Dict[str, any]:
        """
        Complete analysis of an edge.

        Args:
            edge: BGR image of edge
            position: Edge position ('top', 'right', 'bottom', 'left')

        Returns:
            Complete edge analysis
        """
        whitening = self.detect_whitening(edge)

        # Calculate edge score
        whitening_penalty = min(whitening / 1.5, 6)  # Edges are stricter

        score = max(1, 10 - whitening_penalty)

        return {
            'position': position,
            'score': round(score, 1),
            'whitening_percent': whitening,
            'defects': self._list_edge_defects(whitening)
        }

    def analyze_surface(self, front: np.ndarray, back: np.ndarray) -> Dict[str, any]:
        """
        Complete surface analysis.

        Args:
            front: BGR image of card front
            back: BGR image of card back

        Returns:
            Complete surface analysis
        """
        # Analyze front
        front_scratches = self.detect_scratches(front)
        front_creases = self.detect_creases(front)

        # Analyze back
        back_scratches = self.detect_scratches(back)
        back_creases = self.detect_creases(back)

        # Calculate combined severity
        scratch_severity = max(front_scratches['severity'], back_scratches['severity'])
        crease_severity = max(front_creases['severity'], back_creases['severity'])

        total_severity = (scratch_severity * 0.6 + crease_severity * 0.4)

        # Calculate score
        score = max(1, 10 - (total_severity / 10))

        return {
            'score': round(score, 1),
            'front': {
                'scratches': front_scratches,
                'creases': front_creases
            },
            'back': {
                'scratches': back_scratches,
                'creases': back_creases
            },
            'defects': self._list_surface_defects(
                front_scratches, front_creases,
                back_scratches, back_creases
            )
        }

    def analyze_print_quality(self, front: np.ndarray) -> Dict[str, any]:
        """
        Analyze print quality (factory defects only).

        Args:
            front: BGR image of card front

        Returns:
            Print quality analysis
        """
        defects = self.detect_print_defects(front)

        # Calculate score
        score = max(1, 10 - (defects['severity'] / 10))

        return {
            'score': round(score, 1),
            'ink_dots': defects['ink_dots'],
            'color_issues': defects['color_issues'],
            'defects': [] if defects['severity'] < 10 else ['print_defects']
        }

    def _list_corner_defects(self, whitening: float, sharpness: float) -> List[str]:
        """List defects found on corner."""
        defects = []
        if whitening > 5:
            defects.append('whitening')
        if whitening > 15:
            defects.append('heavy_whitening')
        if sharpness < 60:
            defects.append('rounding')
        if sharpness < 30:
            defects.append('heavy_rounding')
        return defects

    def _list_edge_defects(self, whitening: float) -> List[str]:
        """List defects found on edge."""
        defects = []
        if whitening > 3:
            defects.append('minor_whitening')
        if whitening > 8:
            defects.append('whitening')
        if whitening > 15:
            defects.append('heavy_whitening')
        return defects

    def _list_surface_defects(
        self,
        front_scratches: Dict,
        front_creases: Dict,
        back_scratches: Dict,
        back_creases: Dict
    ) -> List[str]:
        """List defects found on surface."""
        defects = []

        if front_scratches['count'] > 0 or back_scratches['count'] > 0:
            defects.append('scratches')
        if front_scratches['count'] > 3 or back_scratches['count'] > 3:
            defects.append('heavy_scratches')

        if front_creases['detected'] or back_creases['detected']:
            defects.append('creases')

        return defects
