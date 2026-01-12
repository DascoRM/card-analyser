"""Inference module for card grading."""

from .grader import CardGrader
from .rule_based_grader import RuleBasedGrader

__all__ = ["CardGrader", "RuleBasedGrader"]
