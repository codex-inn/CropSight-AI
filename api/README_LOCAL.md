# Run CropSight AI locally on Windows

This backend does **not** make up predictions. Until you provide a trained tomato maturity model, the analyze endpoint returns HTTP 503. The API only accepts a model whose labels include all three required classes.

## 1. Prepare Python

Use Python 3.11 (64-bit) on Windows. Open PowerShell in the repository folder:

~~~powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r api/requirements.txt
~~~

If PowerShell blocks activation, use Command Prompt and run .venv\Scripts\activate.bat.

## 2. Check the API before training

~~~powershell
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
~~~

Open http://127.0.0.1:8000/health. It should report status ok and model not_trained until you install weights. Open http://127.0.0.1:8000/docs to inspect the API. Stop the server with Ctrl+C.

## 3. Prepare a real labeled dataset

You need images from tomato plants and a bounding box around **each tomato**, with one maturity label per box. Do not assume a general object-detection dataset can identify harvest maturity. Have an agronomist or knowledgeable annotator label maturity consistently. Include variation in cultivar, lighting, camera distance, occlusion, and growing conditions. Split by plant/plot/session—not near-duplicate frames—into training, validation, and test sets.

Use YOLO detection format: one TXT file per image, each row has class_id, x_center, y_center, width, height, with coordinates normalized to 0–1. Class IDs must be exactly:

- 0: harvest_ready
- 1: nearly_ready
- 2: developing

Example dataset layout:

~~~text
tomato-dataset/
  images/
    train/
    val/
    test/
  labels/
    train/
    val/
    test/
~~~

Copy api/dataset.yaml.example to a location of your choice (for example tomato-dataset/dataset.yaml) and edit its absolute path to your dataset root. Make sure each image has a correctly annotated label file; an empty label file means the image contains no labeled tomatoes.

**Important:** classes must be labeled from real examples and checked for consistency. The model does not know these categories just because the class names exist in YAML.

## 4. Validate the dataset before training

After extracting the provided `CropSight_tomatOD_YOLO.zip`, locate its `dataset.yaml`. The extracted folder should contain `images`, `labels`, `dataset.yaml`, and `DATASET_NOTES.md`. From the repository root with the virtual environment active, run:

~~~powershell
python api/validate_dataset.py --data "C:\\CropSightData\\cropsight_tomatod_yolo\\dataset.yaml"
~~~

Replace that example path with the actual location of your extracted dataset. Continue only if the validator prints `PASSED`. It checks file presence, YOLO syntax, class IDs, and normalized coordinates; it cannot verify that the maturity labels are agronomically correct.

The included dataset maps `fully-ripe` to `harvest_ready`, `semi-ripe` to `nearly_ready`, and `unripe` to `developing`. This is only an initial proxy mapping, not a guarantee of harvest readiness. The dataset is small; reserve the provided test split for final evaluation and avoid using it to tune training.

## 5. Train a first model

From the repository root with the virtual environment active:

~~~powershell
python api/train.py --data "C:\path\to\tomato-dataset\dataset.yaml" --epochs 80 --imgsz 640 --batch 8
~~~

The first run downloads the Ultralytics pretrained YOLO checkpoint if it is not already available and needs an internet connection. Training can be slow on CPU; if memory is low, reduce batch size to 4 or 2. If you have a compatible NVIDIA GPU and CUDA-enabled PyTorch installed, consult the PyTorch install selector before choosing GPU packages.

Training is only a starting point. Review precision/recall and mAP, inspect predictions, and evaluate on a held-out test set. If labels are scarce or imbalanced, results may be unreliable. Do not treat confidence as a calibrated probability or use it as an agronomic guarantee.

## 6. Enable the trained model

After reviewing the training run, copy its best.pt checkpoint to the API's expected path:

~~~powershell
New-Item -ItemType Directory -Force api/models | Out-Null
Copy-Item "runs/cropsight/tomato-maturity/weights/best.pt" "api/models/tomato-maturity.pt"
~~~

If the actual training run folder differs, copy from the best.pt path printed by api/train.py. Restart the API and check /health; it should report model: configured. The first analysis request loads the checkpoint and verifies the required class labels. A generic detector with different labels is rejected.

## 7. Connect the local website to the local API

Create a file named .env.local in the repository root (do not commit it) containing:

~~~dotenv
VITE_CROPSIGHT_API_URL=http://127.0.0.1:8000
~~~

Run the frontend in a second PowerShell window from the repository root:

~~~powershell
npm install
npm run dev
~~~

Open the local Vite URL printed in the terminal (usually http://localhost:5173/CropSight-AI/). Upload a test image and click Analyze. Keep the API terminal running. If you change .env.local, restart Vite.

The deployed GitHub Pages website cannot reach your PC's 127.0.0.1; use the **local** website URL for this test. Do not expose the local API to the public internet without proper authentication, rate limits, and deployment security.

## API behavior

- GET /health: service and model file status (does not guarantee model quality).
- POST /api/v1/analyze: real model detections only; missing weights, wrong class names, or inference errors return explicit errors.
- Output boxes are normalized [x1, y1, x2, y2] coordinates.
- estimated_days_to_harvest is always null until a separate, validated forecasting method is implemented.
