"""
Card Detection and Extraction using OpenCV.

Handles:
- Card contour detection in photos
- Perspective transformation (straightening)
- Border measurement for centering
- Corner and edge extraction for defect analysis
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict


class CardDetector:
    """
    Detects and extracts card from photos using computer vision.
    """

    def __init__(self, target_size: Tuple[int, int] = (600, 825)):
        """
        Initialize the card detector.

        Args:
            target_size: Target size for extracted card (width, height)
                         Default is 600x825 (standard card ratio ~1:1.375)
        """
        self.target_size = target_size
        # Standard Pokemon card ratio (2.5" x 3.5")
        self.card_ratio = 2.5 / 3.5

    def detect_card_contour(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect the card contour in the image.

        Args:
            image: BGR image from OpenCV

        Returns:
            4-point contour of the card or None if not found
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)

        # Dilate to close gaps in edges
        kernel = np.ones((3, 3), np.uint8)
        dilated = cv2.dilate(edges, kernel, iterations=2)

        # Find contours
        contours, _ = cv2.findContours(
            dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return None

        # Sort by area, largest first
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        # Find the first contour that can be approximated to 4 points
        for contour in contours[:5]:  # Check top 5 largest
            # Approximate contour to polygon
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # If we found a quadrilateral
            if len(approx) == 4:
                # Check if it's roughly card-shaped (ratio check)
                if self._is_card_shaped(approx):
                    return approx

        # Fallback: use the largest contour's bounding rect
        if contours:
            largest = contours[0]
            rect = cv2.minAreaRect(largest)
            box = cv2.boxPoints(rect)
            return np.int32(box)

        return None

    def extract_card(self, image: np.ndarray, contour: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Extract and straighten the card from the image.

        Args:
            image: BGR image from OpenCV
            contour: 4-point contour (if None, will detect)

        Returns:
            Straightened card image
        """
        if contour is None:
            contour = self.detect_card_contour(image)

        if contour is None:
            # If no card detected, assume full image is the card
            return cv2.resize(image, self.target_size)

        # Order points: top-left, top-right, bottom-right, bottom-left
        pts = self._order_points(contour.reshape(4, 2))

        # Apply perspective transform
        dst = np.array([
            [0, 0],
            [self.target_size[0] - 1, 0],
            [self.target_size[0] - 1, self.target_size[1] - 1],
            [0, self.target_size[1] - 1]
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(pts.astype(np.float32), dst)
        warped = cv2.warpPerspective(image, M, self.target_size)

        return warped

    def measure_borders(self, card_image: np.ndarray) -> Dict[str, float]:
        """
        Measure the border widths for centering calculation.

        Args:
            card_image: Straightened card image

        Returns:
            Dictionary with left, right, top, bottom border widths in pixels
        """
        h, w = card_image.shape[:2]

        # Convert to grayscale
        gray = cv2.cvtColor(card_image, cv2.COLOR_BGR2GRAY)

        # Apply adaptive threshold to find the inner artwork
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # Find edges using Sobel
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # Analyze horizontal profile for left/right borders
        h_profile = np.abs(sobel_x).mean(axis=0)
        left_border = self._find_border_edge(h_profile, from_start=True)
        right_border = self._find_border_edge(h_profile, from_start=False)

        # Analyze vertical profile for top/bottom borders
        v_profile = np.abs(sobel_y).mean(axis=1)
        top_border = self._find_border_edge(v_profile, from_start=True)
        bottom_border = self._find_border_edge(v_profile, from_start=False)

        return {
            'left': float(left_border),
            'right': float(w - right_border),
            'top': float(top_border),
            'bottom': float(h - bottom_border),
            'width': float(w),
            'height': float(h)
        }

    def extract_corners(self, card_image: np.ndarray, size: int = 60) -> List[np.ndarray]:
        """
        Extract the 4 corners of the card for defect analysis.

        Args:
            card_image: Straightened card image
            size: Size of corner crop in pixels

        Returns:
            List of 4 corner images [top_left, top_right, bottom_left, bottom_right]
        """
        h, w = card_image.shape[:2]

        corners = [
            card_image[0:size, 0:size],                    # Top-left
            card_image[0:size, w-size:w],                  # Top-right
            card_image[h-size:h, 0:size],                  # Bottom-left
            card_image[h-size:h, w-size:w]                 # Bottom-right
        ]

        return corners

    def extract_edges(self, card_image: np.ndarray, thickness: int = 15) -> List[np.ndarray]:
        """
        Extract the 4 edges of the card for defect analysis.

        Args:
            card_image: Straightened card image
            thickness: Thickness of edge strip in pixels

        Returns:
            List of 4 edge images [top, right, bottom, left]
        """
        h, w = card_image.shape[:2]

        # Exclude corners (use corner size)
        corner_size = 60

        edges = [
            card_image[0:thickness, corner_size:w-corner_size],        # Top
            card_image[corner_size:h-corner_size, w-thickness:w],      # Right
            card_image[h-thickness:h, corner_size:w-corner_size],      # Bottom
            card_image[corner_size:h-corner_size, 0:thickness]         # Left
        ]

        return edges

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        """
        Order points in: top-left, top-right, bottom-right, bottom-left order.
        """
        rect = np.zeros((4, 2), dtype=np.float32)

        # Top-left has smallest sum, bottom-right has largest sum
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        # Top-right has smallest diff, bottom-left has largest diff
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]

        return rect

    def _is_card_shaped(self, contour: np.ndarray) -> bool:
        """
        Check if contour has card-like proportions.
        """
        pts = contour.reshape(4, 2)

        # Calculate width and height
        width1 = np.linalg.norm(pts[0] - pts[1])
        width2 = np.linalg.norm(pts[2] - pts[3])
        height1 = np.linalg.norm(pts[0] - pts[3])
        height2 = np.linalg.norm(pts[1] - pts[2])

        avg_width = (width1 + width2) / 2
        avg_height = (height1 + height2) / 2

        # Calculate ratio
        if avg_height == 0:
            return False
        ratio = avg_width / avg_height

        # Card ratio should be close to 2.5/3.5 ≈ 0.714
        # Allow some tolerance (0.5 to 0.9)
        return 0.5 <= ratio <= 0.9

    def _find_border_edge(self, profile: np.ndarray, from_start: bool) -> int:
        """
        Find the edge of the border in a 1D profile.

        Args:
            profile: 1D array of gradient magnitudes
            from_start: If True, search from start; if False, search from end

        Returns:
            Position of the border edge
        """
        # Normalize profile
        if profile.max() > 0:
            profile = profile / profile.max()

        # Threshold for detecting edge
        threshold = 0.3

        if from_start:
            indices = np.where(profile > threshold)[0]
            return indices[0] if len(indices) > 0 else 0
        else:
            indices = np.where(profile > threshold)[0]
            return indices[-1] if len(indices) > 0 else len(profile) - 1
