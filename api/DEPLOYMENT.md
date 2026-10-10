# CropSight AI inference API container

This container runs the FastAPI inference service. It does **not** contain trained model weights. The service will report `model: not_trained` until a valid model file exists at `/var/data/tomato-maturity.pt`.

After training:
1. Download the `cropsight-tomato-model` artifact from GitHub Actions.
2. Place its `best.pt` file on the persistent disk at `/var/data/tomato-maturity.pt` using your hosting provider's supported file-transfer method.
3. Confirm `GET /health` reports `model: configured`.
4. Configure the frontend build variable `VITE_CROPSIGHT_API_URL` to the deployed API base URL and redeploy GitHub Pages.
5. Upload unseen tomato photos and verify the returned boxes/counts; don't rely on metrics alone.

## Deployment
The repository root includes `render.yaml` as a Render Blueprint for this API. Create a new Blueprint from this repository in Render. The starter service and persistent disk may incur charges. Review pricing before deploying. The model file must be installed separately after training.

## Endpoints
- `GET /health`: service/model-file status; this does not assess model quality.
- `POST /api/v1/analyze`: image inference. Missing weights produce HTTP 503, not fabricated predictions.
