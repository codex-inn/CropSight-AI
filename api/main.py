from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

app = FastAPI(title="CropSight AI Inference API", version="0.2.0")

allowed_origins = [
    value.strip()
    for value in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://codex-inn.github.io",
    ).split(",")
    if value.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "tomato-maturity.pt"
MODEL_PATH = Path(os.getenv("CROPSIGHT_MODEL_PATH", str(DEFAULT_MODEL_PATH))).expanduser()
REQUIRED_CLASSES = {"harvest_ready", "nearly_ready", "developing"}
_model: YOLO | None = None


def load_model() -> YOLO:
    global _model
    if _model is not None:
        return _model
    if not MODEL_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                f"No trained model found at '{MODEL_PATH}'. Train a model using api/train.py "
                "and copy its best.pt weights to api/models/tomato-maturity.pt. "
                "No demo predictions are returned by this API."
            ),
        )
    try:
        model = YOLO(str(MODEL_PATH))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load model weights: {exc}") from exc
    names = model.names
    values = set(names.values()) if isinstance(names, dict) else set(names)
    normalized = {str(name).strip().lower().replace(" ", "_") for name in values}
    if not REQUIRED_CLASSES.issubset(normalized):
        raise HTTPException(
            status_code=422,
            detail=(
                "The loaded model does not contain the required maturity classes: "
                "harvest_ready, nearly_ready, developing. Train with the class order documented "
                "in api/README_LOCAL.md. A generic object detector is not a maturity model."
            ),
        )
    _model = model
    return _model


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "cropsight-inference",
        "model": "configured" if MODEL_PATH.is_file() else "not_trained",
    }


@app.post("/api/v1/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")
    try:
        with Image.open(BytesIO(contents)) as check_image:
            check_image.verify()
        with Image.open(BytesIO(contents)) as opened_image:
            image = opened_image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")

    model = load_model()
    try:
        results = model.predict(source=image, verbose=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    if not results:
        raise HTTPException(status_code=500, detail="The model returned no inference result.")
    result = results[0]
    names = result.names
    detections: list[dict[str, Any]] = []
    counts = {name: 0 for name in REQUIRED_CLASSES}
    confidences: list[float] = []

    if result.boxes is not None:
        for index, box in enumerate(result.boxes):
            class_id = int(box.cls.item())
            raw_name = names[class_id]
            class_name = str(raw_name).strip().lower().replace(" ", "_")
            if class_name not in REQUIRED_CLASSES:
                continue
            confidence = float(box.conf.item())
            x1, y1, x2, y2 = [float(value) for value in box.xyxyn[0].tolist()]
            counts[class_name] += 1
            confidences.append(confidence)
            detections.append({
                "id": f"TM-{index + 1:03d}",
                "class": class_name,
                "confidence": round(confidence, 4),
                "box": [round(x1, 6), round(y1, 6), round(x2, 6), round(y2, 6)],
                "estimated_days_to_harvest": None,
            })

    return {
        "scan_id": f"CS-{os.urandom(4).hex().upper()}",
        "field": "Uploaded image",
        "summary": {
            "harvest_ready": counts["harvest_ready"],
            "nearly_ready": counts["nearly_ready"],
            "developing": counts["developing"],
            "mean_confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
        },
        "detections": detections,
        "model": MODEL_PATH.name,
        "notice": "Detection confidence is not a calibrated probability. Days-to-harvest is not estimated.",
    }
