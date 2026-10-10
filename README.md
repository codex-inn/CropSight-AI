# CropSight AI

**See Your Crop. Know Your Harvest.**

CropSight AI is a responsive crop-maturity monitoring MVP. The web interface includes a dashboard, image upload, maturity summary, field cards, scan history, and CSV reporting.

## Web app

The production build is deployed to GitHub Pages using GitHub Actions. After the workflow completes, the project should be available at:

https://codex-inn.github.io/CropSight-AI/

## Local development

```bash
npm install
npm run dev
```

Build and type-check:

```bash
npm run build
```

## Analysis modes

- **Demo mode (default):** deterministic sample values so the interface can be evaluated without a model. These are not predictions about the uploaded image.
- **Live API mode:** set `VITE_CROPSIGHT_API_URL` to a deployed CropSight inference API URL. The frontend sends the selected image as multipart form data to `POST /api/v1/analyze`. If the service fails, the UI reports an error and does not silently substitute demo results.

## Inference API contract

The endpoint accepts one image file under the `file` field and returns JSON:

```json
{
  "scan_id": "CS-0001",
  "field": "Uploaded image",
  "summary": {
    "harvest_ready": 2,
    "nearly_ready": 3,
    "developing": 5,
    "mean_confidence": 0.91
  },
  "detections": [
    {
      "id": "TM-001",
      "class": "nearly_ready",
      "confidence": 0.94,
      "box": [0.12, 0.18, 0.31, 0.49],
      "estimated_days_to_harvest": 5
    }
  ]
}
```

The frontend integration boundary is ready, but **a real trained crop detector and maturity model still need to be supplied and deployed**. No model weights are bundled in this repository. Do not use demo output as a real harvest recommendation.

## Roadmap

1. Train/validate a tomato detector and maturity classifier using representative field images.
2. Deploy the model behind the inference API contract above.
3. Add secure accounts, persistent scans, field records, and image storage.
4. Validate harvest forecasts across varieties, lighting, growth stages, and field conditions before production use.
