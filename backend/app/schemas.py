from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DetectionBox(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class Detection(BaseModel):
    id: str
    stage: Literal['harvest-ready', 'nearly-ready', 'developing']
    confidence: float = Field(ge=0, le=100)
    bbox: DetectionBox


class MaturityCounts(BaseModel):
    harvestReady: int = Field(ge=0)
    nearlyReady: int = Field(ge=0)
    developing: int = Field(ge=0)


class Forecast(BaseModel):
    harvestWindowStart: datetime
    harvestWindowEnd: datetime
    confidenceLabel: Literal['low', 'medium', 'high']
    notes: str


class ModelInfo(BaseModel):
    mode: Literal['demo', 'api'] = 'demo'
    version: str


class AnalysisResponse(BaseModel):
    detections: list[Detection]
    maturityCounts: MaturityCounts
    confidence: float = Field(ge=0, le=100)
    forecast: Forecast
    model: ModelInfo
    warnings: list[str]
    createdAt: datetime


class HealthResponse(BaseModel):
    status: Literal['ok'] = 'ok'
    service: str = 'cropsight-demo-api'
    model_mode: Literal['demo'] = 'demo'
