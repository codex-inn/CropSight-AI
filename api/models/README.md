# Model weights

Place your validated tomato maturity model here as `tomato-maturity.pt`, or set the `CROPSIGHT_MODEL_PATH` environment variable to the mounted model path.

Model weights are intentionally not committed to Git. The API currently validates requests and returns an explicit unavailable/not-implemented response until a model-specific inference adapter and calibrated class mapping are implemented.
