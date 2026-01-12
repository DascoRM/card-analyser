"""
Card Grading ML Service - FastAPI Application
"""

import os
import time
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inference.grader import CardGrader

# Load environment variables
load_dotenv()

# Configuration
ML_API_KEY = os.getenv("ML_API_KEY", "dev-api-key")
ML_HOST = os.getenv("ML_HOST", "0.0.0.0")
ML_PORT = int(os.getenv("ML_PORT", "5000"))
ML_DEBUG = os.getenv("ML_DEBUG", "true").lower() == "true"
ML_UPLOADS_PATH = os.getenv("ML_UPLOADS_PATH", "../apps/api/uploads")

# Global grader instance
grader: Optional[CardGrader] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    global grader
    print("Initializing rule-based grading system...")
    grader = CardGrader(uploads_base_path=ML_UPLOADS_PATH)
    await grader.load_model()
    print("Rule-based grading system ready")
    yield
    print("Shutting down ML service...")


app = FastAPI(
    title="Card Grading ML Service",
    description="Rule-based card grading API using OpenCV and official PCA/PSA/BGS standards",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Key validation
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Validate API key from header."""
    if x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# Request/Response models
class AnalyzeRequest(BaseModel):
    """Request body for card analysis."""
    front_image: str  # Path to front image (relative to uploads)
    back_image: str   # Path to back image (relative to uploads)
    session_id: str   # Session ID for tracking


class AnalyzeResponse(BaseModel):
    """Response from card analysis."""
    centering: float
    corners: float
    edges: float
    surface: float
    printQuality: float
    finalGrade: float
    gradeLabel: str
    confidence: float
    modelVersion: str
    method: str
    rawData: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    version: str
    timestamp: float


class ModelInfoResponse(BaseModel):
    """Model information response."""
    version: str
    lastUpdated: str
    method: str
    description: str


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok" if grader and grader.is_loaded else "degraded",
        model_loaded=grader.is_loaded if grader else False,
        version="1.0.0",
        timestamp=time.time(),
    )


@app.get("/model/info", response_model=ModelInfoResponse)
async def model_info(api_key: str = Depends(verify_api_key)):
    """Get model information."""
    if not grader:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return ModelInfoResponse(
        version=grader.model_version,
        lastUpdated="2026-01-12",
        method="rule_based",
        description="Rule-based grading using OpenCV and official PCA/PSA standards",
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_card(
    request: AnalyzeRequest,
    api_key: str = Depends(verify_api_key),
):
    """
    Analyze a card and return grading scores.

    Args:
        request: Contains paths to front and back images

    Returns:
        Grading scores for all 5 criteria plus confidence
    """
    if not grader or not grader.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        result = await grader.analyze(
            front_image_path=request.front_image,
            back_image_path=request.back_image,
            session_id=request.session_id,
        )

        return AnalyzeResponse(
            centering=result["centering"],
            corners=result["corners"],
            edges=result["edges"],
            surface=result["surface"],
            printQuality=result["printQuality"],
            finalGrade=result["finalGrade"],
            gradeLabel=result["gradeLabel"],
            confidence=result["confidence"],
            modelVersion=result["modelVersion"],
            method=result["method"],
            rawData=result.get("rawData"),
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Image not found: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=ML_HOST,
        port=ML_PORT,
        reload=ML_DEBUG,
    )
