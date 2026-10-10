from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import get_allowed_origins, get_max_upload_bytes
from .inference import DemoInferenceService
from .schemas import AnalysisResponse, HealthResponse

app = FastAPI(title='CropSight AI Demo API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=['POST', 'GET', 'OPTIONS'],
    allow_headers=['*'],
)

inference_service = DemoInferenceService()
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


@app.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post('/api/v1/analyze', response_model=AnalysisResponse)
async def analyze(
    image: UploadFile = File(...),
    crop_type: str = Form(...),
    field_id: str = Form(...),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
) -> AnalysisResponse:
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported file type. Use JPG, PNG, or WEBP.')

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail='Uploaded image is empty.')

    if len(image_bytes) > get_max_upload_bytes():
        raise HTTPException(status_code=400, detail='Uploaded image exceeds configured maximum size.')

    if crop_type.lower() != 'tomato':
        raise HTTPException(status_code=400, detail='Only tomato is supported in this release.')

    _ = (latitude, longitude)  # accepted contract fields for future geo-calibration use.

    return inference_service.analyze(image_bytes=image_bytes, field_id=field_id, crop_type=crop_type)
