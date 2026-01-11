"""
Card Grader - Main inference class for card grading.
"""

import os
from pathlib import Path
from typing import Optional

import numpy as np

from preprocessing.image_processor import ImageProcessor


class CardGrader:
    """
    Card grading inference class.

    For MVP, this uses a mock model that returns realistic scores.
    Will be replaced with actual TensorFlow model when trained.
    """

    def __init__(self, uploads_base_path: str = "./uploads"):
        self.uploads_base_path = Path(uploads_base_path)
        self.image_processor = ImageProcessor()
        self.model = None
        self.is_loaded = False
        self.model_version = "mvp-v1.0.0-mock"

    async def load_model(self) -> None:
        """
        Load the TensorFlow model.

        For MVP, we just mark as loaded (using mock inference).
        TODO: Load actual TensorFlow model when available.
        """
        # TODO: Implement actual model loading
        # self.model = tf.keras.models.load_model(model_path)

        # For MVP, we use mock inference
        self.is_loaded = True
        print(f"Model '{self.model_version}' ready (mock mode)")

    async def analyze(
        self,
        front_image_path: str,
        back_image_path: str,
        session_id: str,
    ) -> dict:
        """
        Analyze a card and return grading scores.

        Args:
            front_image_path: Path to front image (relative, e.g., '/uploads/sessions/xxx.jpg')
            back_image_path: Path to back image
            session_id: Session ID for tracking

        Returns:
            Dictionary with scores and metadata
        """
        # Resolve full paths
        front_full = self._resolve_path(front_image_path)
        back_full = self._resolve_path(back_image_path)

        # Validate files exist
        if not front_full.exists():
            raise FileNotFoundError(f"Front image not found: {front_image_path}")
        if not back_full.exists():
            raise FileNotFoundError(f"Back image not found: {back_image_path}")

        # Preprocess images
        front_tensor = await self.image_processor.process(front_full)
        back_tensor = await self.image_processor.process(back_full)

        # Get image quality metrics
        front_quality = self.image_processor.assess_quality(front_full)
        back_quality = self.image_processor.assess_quality(back_full)

        # Run inference (mock for MVP)
        scores = await self._infer(front_tensor, back_tensor)

        # Adjust confidence based on image quality
        base_confidence = scores["confidence"]
        quality_factor = (front_quality["score"] + back_quality["score"]) / 2
        adjusted_confidence = base_confidence * quality_factor

        return {
            "centering": scores["centering"],
            "corners": scores["corners"],
            "edges": scores["edges"],
            "surface": scores["surface"],
            "printQuality": scores["printQuality"],
            "confidence": round(adjusted_confidence, 3),
            "modelVersion": self.model_version,
            "rawData": {
                "sessionId": session_id,
                "imageQuality": {
                    "front": front_quality,
                    "back": back_quality,
                },
                "mock": True,  # Remove when using real model
            },
        }

    async def _infer(
        self,
        front_tensor: np.ndarray,
        back_tensor: np.ndarray,
    ) -> dict:
        """
        Run model inference.

        For MVP, returns mock scores based on image analysis.
        TODO: Replace with actual TensorFlow inference.
        """
        # TODO: Implement actual inference
        # predictions = self.model.predict([front_tensor, back_tensor])

        # Mock inference with realistic distribution
        # Scores tend to cluster around 7-9 for most cards
        np.random.seed(hash(str(front_tensor.sum()) + str(back_tensor.sum())) % 2**32)

        def generate_score() -> float:
            """Generate a realistic score (1-10) with natural distribution."""
            # Most cards score 7-9, fewer score 10 or below 6
            base = np.random.normal(8.0, 1.0)
            score = np.clip(base, 1.0, 10.0)
            return round(score, 1)

        return {
            "centering": generate_score(),
            "corners": generate_score(),
            "edges": generate_score(),
            "surface": generate_score(),
            "printQuality": generate_score(),
            "confidence": round(0.75 + np.random.random() * 0.2, 3),  # 0.75-0.95
        }

    def _resolve_path(self, relative_path: str) -> Path:
        """
        Resolve relative path to full path.

        Handles paths like '/uploads/sessions/xxx.jpg' by stripping
        the '/uploads' prefix and joining with uploads_base_path.
        """
        # Remove leading /uploads if present
        clean_path = relative_path
        if clean_path.startswith("/uploads"):
            clean_path = clean_path[8:]  # Remove '/uploads'
        if clean_path.startswith("/"):
            clean_path = clean_path[1:]  # Remove leading slash

        return self.uploads_base_path / clean_path
