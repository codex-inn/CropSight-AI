# CropSight AI Backend (FastAPI demo service)

This backend runs independently and intentionally uses deterministic demo inference without model weights.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
cd backend
pytest
```

## Environment

Copy `.env.example` to `.env`.

- `CORS_ALLOW_ORIGINS` comma-separated origins
- `MAX_UPLOAD_BYTES` upload cap (default 10MB)

## API contract

### `GET /health`
Returns service health and demo mode metadata.

### `POST /api/v1/analyze`
Multipart form-data:
- `image` (JPG/PNG/WEBP)
- `crop_type` (`tomato` currently)
- `field_id`
- optional: `latitude`, `longitude`

Response includes detections, maturity counts, confidence, forecast, model mode/version, warnings, and created timestamp.

## Future integration point

`app/inference.py` contains `InferenceService` and `DemoInferenceService`. Replace `DemoInferenceService` with trained YOLO/classifier model integration for production.

## Persistence path

`app/repositories.py` defines repository interface placeholders for users/fields/scans/detections. Integrate SQLModel/SQLAlchemy repositories when backend persistence is added.
