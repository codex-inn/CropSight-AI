# CropSight AI

**See Your Crop. Know Your Harvest.**

CropSight AI is a production-oriented React + TypeScript dashboard with a minimal FastAPI backend contract for crop maturity analysis. The current release supports **tomato** and explicitly distinguishes **Demo** vs **API** analysis mode.

> ⚠️ CropSight AI outputs are advisory only. This app does **not** claim production agronomic accuracy.

## Architecture

- `src/` Frontend (React 18 + Vite + TypeScript)
  - Dashboard, Scan Crop, My Fields, Scan History, Reports, Settings/Help
  - Typed domain models
  - localStorage persistence with schema metadata and safe fallback
  - Analysis adapter boundary (`API adapter` or deterministic `mock adapter` fallback)
- `backend/` FastAPI service
  - `GET /health`
  - `POST /api/v1/analyze` (multipart image + form fields)
  - deterministic demo inference service interface (future YOLO/classifier integration point)

## Frontend setup

```bash
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

### Frontend environment

Copy `.env.example` to `.env` and set:

- `VITE_API_BASE_URL` (optional)
  - unset/empty => deterministic **Demo mode**
  - set to backend URL => **API mode**

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend URL: `http://localhost:8000`

## API contract

### `GET /health`
Returns status metadata.

### `POST /api/v1/analyze`
Multipart form-data fields:
- `image` (JPG/PNG/WEBP, validated)
- `crop_type` (`tomato`)
- `field_id`
- optional `latitude`, `longitude`

Response includes:
- detections
- maturity counts
- confidence
- forecast
- model mode/version
- warnings
- created timestamp

## Persistence model (frontend)

localStorage namespace: `cropsight.ai`

Stored keys include schema/version envelope metadata:
- `cropsight.ai.fields`
- `cropsight.ai.scans`
- `cropsight.ai.settings`

Behavior:
- safe parse with fallback defaults
- migration-safe envelope handling
- reset demo data action in Settings/Help
- no secrets persisted

## Reports and exports

- Dashboard and Reports are computed from persisted scans
- maturity distribution and forecast summary
- CSV export uses escaping for commas/quotes/newlines
- print-friendly report view

## Accessibility and UX notes

- keyboard navigation and upload controls
- live region scan-status announcements
- drag/drop + file picker + camera capture input
- loading and retry states
- low-confidence review warning
- error boundary and empty/error states

## Testing

Frontend:
```bash
npm run test
```

Backend:
```bash
cd backend
pytest
```

Build frontend:
```bash
npm run build
```

## Docker (optional)

```bash
docker compose up --build
```

## Security and privacy notes

- Demo mode runs without external keys, model weights, or datasets.
- Do not place API secrets in client-side env vars.
- Uploaded images are processed in-memory by demo backend and not persisted by default.

## Roadmap

- Replace `DemoInferenceService` with trained detector/classifier service.
- Add backend persistence (SQLModel/SQLAlchemy repositories for users/fields/scans/detections).
- Add auth/roles, cloud storage, and model observability.
- Extend to additional crops after tomato baseline validation.
