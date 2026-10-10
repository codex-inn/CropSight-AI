from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256

from .schemas import AnalysisResponse, Detection, DetectionBox, Forecast, MaturityCounts, ModelInfo


class InferenceService:
    """Interface for inference backends.

    Replace DemoInferenceService with a trained YOLO/classifier implementation in production.
    """

    def analyze(self, image_bytes: bytes, field_id: str, crop_type: str) -> AnalysisResponse:  # pragma: no cover - interface
        raise NotImplementedError


class DemoInferenceService(InferenceService):
    def analyze(self, image_bytes: bytes, field_id: str, crop_type: str) -> AnalysisResponse:
        digest = sha256(image_bytes + field_id.encode() + crop_type.encode()).hexdigest()
        seed = int(digest[:8], 16)
        total = 8 + (seed % 7)

        stages = ['harvest-ready', 'nearly-ready', 'developing']
        detections: list[Detection] = []

        for idx in range(total):
            stage = stages[(seed + idx) % len(stages)]
            detections.append(
                Detection(
                    id=f'det-{seed}-{idx}',
                    stage=stage,
                    confidence=72 + ((seed + idx * 13) % 26),
                    bbox=DetectionBox(
                        x=round(0.1 + ((seed + idx) % 4) * 0.15, 2),
                        y=round(0.08 + ((seed + idx * 3) % 3) * 0.2, 2),
                        width=0.2,
                        height=0.22,
                    ),
                )
            )

        counts = MaturityCounts(
            harvestReady=sum(1 for d in detections if d.stage == 'harvest-ready'),
            nearlyReady=sum(1 for d in detections if d.stage == 'nearly-ready'),
            developing=sum(1 for d in detections if d.stage == 'developing'),
        )

        now = datetime.now(UTC)
        offset_days = 5 if counts.harvestReady >= counts.nearlyReady else 8

        return AnalysisResponse(
            detections=detections,
            maturityCounts=counts,
            confidence=round(sum(d.confidence for d in detections) / len(detections), 2),
            forecast=Forecast(
                harvestWindowStart=now + timedelta(days=offset_days),
                harvestWindowEnd=now + timedelta(days=offset_days + 3),
                confidenceLabel='medium',
                notes='Deterministic demo forecast. Replace with trained model + agronomy calibration.',
            ),
            model=ModelInfo(mode='demo', version='deterministic-mock-v1'),
            warnings=[
                'Demo mode: this response does not come from trained production weights.',
                'Use for product demonstration only and validate in field before harvest decisions.',
            ],
            createdAt=now,
        )
