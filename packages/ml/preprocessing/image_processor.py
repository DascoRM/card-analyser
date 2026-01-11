"""
Image preprocessing for card grading.
"""

from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


class ImageProcessor:
    """
    Image preprocessing for card grading model.

    Handles:
    - Image loading and validation
    - Resizing to model input size
    - Normalization
    - Quality assessment
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        normalize: bool = True,
    ):
        self.target_size = target_size
        self.normalize = normalize

    async def process(self, image_path: Path) -> np.ndarray:
        """
        Process an image for model inference.

        Args:
            image_path: Path to the image file

        Returns:
            Preprocessed image as numpy array (1, H, W, C)
        """
        # Load image
        image = self._load_image(image_path)

        # Resize
        image = self._resize(image)

        # Normalize
        if self.normalize:
            image = self._normalize(image)

        # Add batch dimension
        image = np.expand_dims(image, axis=0)

        return image

    def assess_quality(self, image_path: Path) -> dict:
        """
        Assess image quality for confidence adjustment.

        Args:
            image_path: Path to the image file

        Returns:
            Quality metrics dictionary
        """
        # Load image with OpenCV for analysis
        img = cv2.imread(str(image_path))

        if img is None:
            return {
                "score": 0.5,
                "blur": 0.0,
                "brightness": 0.5,
                "valid": False,
            }

        # Convert to grayscale for analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Blur detection (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(laplacian_var / 500, 1.0)  # Normalize to 0-1

        # Brightness analysis
        brightness = np.mean(gray) / 255.0
        # Optimal brightness is around 0.4-0.6
        brightness_score = 1.0 - abs(brightness - 0.5) * 2

        # Resolution check
        height, width = img.shape[:2]
        resolution_score = min((width * height) / (1920 * 1080), 1.0)

        # Combined quality score
        quality_score = (blur_score * 0.4 + brightness_score * 0.3 + resolution_score * 0.3)

        return {
            "score": round(quality_score, 3),
            "blur": round(blur_score, 3),
            "brightness": round(brightness, 3),
            "resolution": [width, height],
            "valid": quality_score > 0.3,
        }

    def _load_image(self, path: Path) -> np.ndarray:
        """Load image from path."""
        image = Image.open(path)

        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")

        return np.array(image)

    def _resize(self, image: np.ndarray) -> np.ndarray:
        """Resize image to target size."""
        pil_image = Image.fromarray(image)
        resized = pil_image.resize(self.target_size, Image.Resampling.LANCZOS)
        return np.array(resized)

    def _normalize(self, image: np.ndarray) -> np.ndarray:
        """Normalize image to [0, 1] range."""
        return image.astype(np.float32) / 255.0
