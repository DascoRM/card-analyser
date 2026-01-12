"""
Card Grader - Main inference class for card grading.

Uses rule-based grading with OpenCV for deterministic,
explainable results based on official PCA/PSA standards.
"""

import os
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from preprocessing.image_processor import ImageProcessor
from inference.rule_based_grader import RuleBasedGrader


class CardGrader:
    """
    Card grading inference class.

    Uses rule-based grading with computer vision for:
    - Deterministic results (same image = same grade)
    - Explainable scoring based on official standards
    - No training data required
    """

    def __init__(self, uploads_base_path: str = "./uploads"):
        self.uploads_base_path = Path(uploads_base_path)
        self.image_processor = ImageProcessor()
        self.rule_based_grader = RuleBasedGrader()
        self.model = None
        self.is_loaded = False
        self.model_version = "rule-based-v1.0.0"

    async def load_model(self) -> None:
        """
        Initialize the grading system.

        For the rule-based system, this just marks as ready.
        Future ML enhancements will load correction models here.
        """
        self.is_loaded = True
        print(f"Grader '{self.model_version}' ready (rule-based mode)")

    async def analyze(
        self,
        front_image_path: str,
        back_image_path: str,
        session_id: str,
    ) -> dict:
        """
        Analyze a card and return grading scores.

        Uses rule-based grading with computer vision for
        deterministic, explainable results.

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

        # Load images with OpenCV
        front_image = cv2.imread(str(front_full))
        back_image = cv2.imread(str(back_full))

        if front_image is None:
            raise ValueError(f"Could not load front image: {front_image_path}")
        if back_image is None:
            raise ValueError(f"Could not load back image: {back_image_path}")

        # Run rule-based grading
        result = self.rule_based_grader.grade_card(front_image, back_image)

        return {
            "centering": result["centering"],
            "corners": result["corners"],
            "edges": result["edges"],
            "surface": result["surface"],
            "printQuality": result["printQuality"],
            "finalGrade": result["final_grade"],
            "gradeLabel": result["grade_label"],
            "confidence": result["confidence"],
            "modelVersion": self.model_version,
            "method": result["method"],
            "rawData": {
                "sessionId": session_id,
                "details": result["details"],
            },
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
