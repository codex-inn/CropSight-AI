from __future__ import annotations

import os


def get_allowed_origins() -> list[str]:
    raw = os.getenv('CORS_ALLOW_ORIGINS', 'http://localhost:5173')
    return [item.strip() for item in raw.split(',') if item.strip()]


def get_max_upload_bytes() -> int:
    return int(os.getenv('MAX_UPLOAD_BYTES', str(10 * 1024 * 1024)))
