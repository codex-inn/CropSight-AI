from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

app = FastAPI(title="CropSight AI Inference API", version="0.1.0")

allowed_origins = [value.strip() for value in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,https://codex-inn.github.io"
).split(",") if value.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MODEL_PATH = os.getenv("CROPSIGHT_MODEL_PATH", "models/tomato-maturity.pt")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "cropsight-inference"}


@app.post("/api/v1/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")
    try:
        from io import BytesIO
        image = Image.open(BytesIO(contents)).convert("RGB")
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")

    if not Path(MODEL_PATH).is_file():
        raise HTTPException(
            status_code=503,
            detail="Model weights are not installed. Configure CROPSIGHT_MODEL_PATH with a validated tomato maturity model."
        )

    # The model adapter is intentionally not guessed: label mapping and calibration
    # must match the actual trained model before returning harvest recommendations.
    raise HTTPException(
        status_code=501,
        detail="Model weights were found, but the inference adapter has not been configured for this model."
    )
