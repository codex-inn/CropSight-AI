# CropSight AI

**See Your Crop. Know Your Harvest.**

CropSight AI is an agriculture intelligence dashboard for tomato maturity monitoring and harvest planning. This repository currently contains a responsive, dependency-free MVP prototype that can be opened directly in a browser.

## Run locally

Because the MVP is static, no install or environment variables are required:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

You can also open `index.html` directly, although a local HTTP server is recommended for image preview behavior.

## Included MVP flows

- Dashboard with crop maturity metrics, harvest forecast, recent scans, and field health cards
- Crop image upload with drag-and-drop, preview, validation, and demo analysis result
- Deterministic sample tomato detections: harvest-ready, nearly ready, and developing
- Scan history table
- Field management view
- Local CSV report download
- Responsive mobile navigation and accessible labels

## Demo limitation and model integration point

The analysis action intentionally uses a deterministic sample result. No trained computer-vision model or external API is included, and the interface must not be treated as an agricultural diagnosis. The analysis boundary is the `analyzeButton` handler in `app.js`; replace its timeout/demo payload with a `fetch` call to a real inference service, then render the returned typed detection data in the result panel.

A production implementation should add authentication, persistent storage, image object storage, a tomato detector/classifier, field-specific calibration, weather inputs, audit logs, and grower review workflows before making harvest recommendations.

## Project structure

- `index.html` — application markup and views
- `styles.css` — responsive visual system
- `app.js` — navigation, upload handling, demo analysis, and CSV export

## Product roadmap

1. Connect a tomato object-detection and maturity-classification API.
2. Add a backend for users, fields, scans, and forecast history.
3. Add mobile camera capture and offline upload queue.
4. Add disease, pest, yield, and multi-crop models.
