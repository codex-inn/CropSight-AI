"""Train a tomato maturity object detector using a labeled YOLO-format dataset."""
from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="Path to a YOLO dataset YAML file")
    parser.add_argument("--base-model", default="yolo11n.pt", help="Pretrained YOLO checkpoint for transfer learning")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--device", default="", help="Optional: 0 for first CUDA GPU; leave blank for auto/CPU")
    args = parser.parse_args()

    data_path = Path(args.data).expanduser().resolve()
    if not data_path.is_file():
        raise SystemExit(f"Dataset YAML not found: {data_path}")
    if args.epochs < 1 or args.imgsz < 32 or args.batch < 1:
        raise SystemExit("epochs, imgsz, and batch must be positive (imgsz >= 32).")

    model = YOLO(args.base_model)
    options = {
        "data": str(data_path),
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": "runs/cropsight",
        "name": "tomato-maturity",
        "exist_ok": True,
        "patience": 15,
    }
    if args.device.strip():
        options["device"] = args.device.strip()
    results = model.train(**options)
    save_dir = Path(results.save_dir)
    best = save_dir / "weights" / "best.pt"
    print(f"Training run: {save_dir}")
    if best.is_file():
        print(f"Best checkpoint: {best.resolve()}")
        print("Review validation metrics and test on separate unseen images before using in the app.")
        print("Copy the best.pt checkpoint to api/models/tomato-maturity.pt to enable the local API.")
    else:
        print("Training finished but best.pt was not found; inspect the training output.")


if __name__ == "__main__":
    main()
