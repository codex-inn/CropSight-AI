"""Validate a YOLO-format CropSight tomato dataset before training."""
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

from PIL import Image
import yaml

EXPECTED = {0: "harvest_ready", 1: "nearly_ready", 2: "developing"}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="Path to dataset.yaml")
    args = parser.parse_args()

    yaml_path = Path(args.data).expanduser().resolve()
    if not yaml_path.is_file():
        print(f"ERROR: dataset YAML not found: {yaml_path}")
        return 2
    config = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
    root = Path(config.get("path", yaml_path.parent))
    if not root.is_absolute():
        root = (yaml_path.parent / root).resolve()

    raw_names = config.get("names", {})
    if isinstance(raw_names, list):
        names = {i: str(name) for i, name in enumerate(raw_names)}
    else:
        names = {int(k): str(v) for k, v in raw_names.items()}
    if names != EXPECTED:
        print(f"ERROR: class mapping must be exactly {EXPECTED}; found {names}")
        return 2

    errors: list[str] = []
    warnings: list[str] = []
    totals = Counter()
    class_boxes = Counter()
    for split in ("train", "val", "test"):
        split_value = config.get(split)
        if not split_value:
            if split != "test":
                errors.append(f"dataset.yaml is missing required '{split}' entry")
            continue
        image_dir = Path(split_value)
        if not image_dir.is_absolute():
            image_dir = root / image_dir
        if not image_dir.is_dir():
            errors.append(f"{split}: image directory not found: {image_dir}")
            continue

        images = sorted(p for p in image_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES)
        if not images:
            errors.append(f"{split}: no supported images found in {image_dir}")
            continue
        totals[f"{split}_images"] = len(images)
        label_dir = root / "labels" / split
        split_boxes = 0

        for image_path in images:
            label_path = label_dir / f"{image_path.stem}.txt"
            if not label_path.is_file():
                errors.append(f"missing label file: {label_path}")
                continue
            try:
                with Image.open(image_path) as im:
                    im.verify()
            except Exception as exc:
                errors.append(f"unreadable image {image_path}: {exc}")
                continue

            for line_number, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), 1):
                if not line.strip():
                    continue
                parts = line.split()
                if len(parts) != 5:
                    errors.append(f"{label_path}:{line_number}: expected 5 values, got {len(parts)}")
                    continue
                try:
                    class_id = int(parts[0])
                    x, y, w, h = map(float, parts[1:])
                except ValueError:
                    errors.append(f"{label_path}:{line_number}: non-numeric annotation")
                    continue
                if class_id not in EXPECTED:
                    errors.append(f"{label_path}:{line_number}: invalid class id {class_id}")
                    continue
                if not all(0 <= value <= 1 for value in (x, y, w, h)) or w <= 0 or h <= 0:
                    errors.append(f"{label_path}:{line_number}: box values must be normalized; width/height > 0")
                    continue
                if x - w / 2 < -1e-5 or y - h / 2 < -1e-5 or x + w / 2 > 1.00001 or y + h / 2 > 1.00001:
                    warnings.append(f"{label_path}:{line_number}: box extends outside normalized image bounds")
                class_boxes[class_id] += 1
                split_boxes += 1
        totals[f"{split}_boxes"] = split_boxes

    print(f"Dataset: {yaml_path}")
    print(f"Root: {root}")
    for split in ("train", "val", "test"):
        if f"{split}_images" in totals:
            print(f"{split}: {totals[f'{split}_images']} images, {totals[f'{split}_boxes']} boxes")
    print("Boxes by class:")
    for class_id, name in EXPECTED.items():
        print(f"  {class_id} {name}: {class_boxes[class_id]}")

    for warning in warnings[:30]:
        print(f"WARNING: {warning}")
    if len(warnings) > 30:
        print(f"WARNING: {len(warnings) - 30} additional warnings omitted")
    for error in errors[:50]:
        print(f"ERROR: {error}")
    if len(errors) > 50:
        print(f"ERROR: {len(errors) - 50} additional errors omitted")
    if errors:
        print(f"FAILED: {len(errors)} issue(s); fix them before training.")
        return 1
    if class_boxes and any(class_boxes[i] == 0 for i in EXPECTED):
        print("WARNING: at least one class has no boxes; training will not learn that class.")
    print("PASSED: dataset files and YOLO annotation syntax look valid. This does not validate label correctness or model quality.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
