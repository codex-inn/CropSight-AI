# CropSight AI

**See Your Crop. Know Your Harvest.**

CropSight AI is a responsive crop-maturity monitoring MVP. The web interface includes a dashboard, image upload, maturity summary, field cards, scan history, and CSV reporting.

## Web app

The production build is deployed to GitHub Pages using GitHub Actions. After the workflow completes, the project should be available at:

https://codex-inn.github.io/CropSight-AI/

## Train the model in your browser (no local terminal)

Open the [CropSight tomato training notebook in Google Colab](https://colab.research.google.com/github/codex-inn/CropSight-AI/blob/main/notebooks/CropSight_Tomato_Training.ipynb). Download `CropSight_tomatOD_YOLO.zip` from the project conversation, open the notebook, run its cells in order, and upload the ZIP when prompted. In Colab, select **Runtime → Change runtime type → T4 GPU** if available.

The notebook trains a YOLO model, evaluates it on the validation split, and downloads `cropsight-model-output.zip`. This is a training workflow, not an automatic deployment. The live GitHub Pages website still needs a deployed API endpoint to use the model. The included tomatOD dataset is CC BY-NC-SA 4.0; respect its non-commercial, attribution, and share-alike terms. Its ripeness labels are only a proxy for harvest readiness.

## Browser-triggered GitHub Actions training (no terminal / no Colab notebook)

A manual workflow is available at **Actions → Train CropSight tomato model → Run workflow**:
https://github.com/codex-inn/CropSight-AI/actions/workflows/train-model.yml

It requires a **direct HTTPS download URL** to the converted YOLO dataset ZIP. A normal web page, Google Drive preview page, or a file only on your computer will not work; the URL must return the ZIP file directly without an interactive sign-in. Enter an epoch count (start with 30), then run the workflow. It validates the ZIP and folder structure, trains YOLO on a GitHub-hosted CPU runner, evaluates the validation split, and stores the model as a workflow artifact for 14 days.

**Important limitations**
- GitHub-hosted standard runners generally use CPU, so training may be slow and can time out. This workflow does not provision a GPU.
- The dataset archive must be accessible to the runner through a direct HTTPS link. Do not commit the 163 MB dataset ZIP to the repository.
- A successful workflow only creates a downloadable model artifact; it does not deploy the FastAPI service or connect it to GitHub Pages.
- The tomatOD dataset is CC BY-NC-SA 4.0. Follow attribution, share-alike and non-commercial terms. Ripeness labels are only a proxy for harvest readiness.
- Never describe the model as reliable for harvest decisions until it has been tested on independent field images.

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
