#!/usr/bin/env python3
"""Fine-tune Ultralytics YOLO11 segmentation on the RipVIS YOLO dataset.

Run as a standalone script in Kaggle (NOT inside the notebook kernel, or multi-GPU DDP fails):

    !pip install -q ultralytics
    !python ml/scripts/train.py --smoke      # ~2 epochs on 10% of train, checks the pipeline
    !python ml/scripts/train.py              # full run

Starts from COCO-pretrained weights with Ultralytics' default augmentations. After training it
evaluates best.pt on the test split (the official RipVIS val split, never trained on) and writes
<project>/<name>/test_metrics.json.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import threading
import time
from pathlib import Path

DEFAULT_DATA = "/kaggle/working/yolo/data.yaml"


def unique_name(project: Path, name: str) -> str:
    """First of name, name2, name3... that does not exist yet, so a rerun never mixes with an old run."""
    if not (project / name).exists():
        return name
    n = 2
    while (project / f"{name}{n}").exists():
        n += 1
    return f"{name}{n}"


def check_devices(device: str) -> None:
    import torch

    if device.strip().lower() in {"cpu", "mps"}:
        return
    ids = [int(d) for d in device.split(",") if d.strip()]
    have = torch.cuda.device_count()
    print(f"CUDA devices visible: {have}; requested: {ids}")
    if have == 0 or max(ids) >= have:
        sys.exit(f"ERROR: --device {device} needs GPU index {max(ids)} but only {have} CUDA device(s) are visible. "
                 f"Check the notebook accelerator (GPU T4 x2) or pass --device 0.")


def read_rows(csv_path: Path) -> list[dict[str, str]]:
    if not csv_path.exists():
        return []
    try:
        with csv_path.open(newline="") as f:
            # A row cut off mid-write has missing fields (None); skip it, it is read again next poll.
            raw = [r for r in csv.DictReader(f) if None not in r.values()]
    except (OSError, csv.Error):
        return []
    rows = [{k.strip(): v.strip() for k, v in r.items() if k} for r in raw]
    return [r for r in rows if r.get("epoch")]


class EpochTimer(threading.Thread):
    """Prints the time each epoch took by tailing results.csv.

    Ultralytics callbacks do not reach the DDP worker processes, but every run writes results.csv
    once per epoch (with a cumulative "time" column), so this works for 1 or many GPUs.
    """

    def __init__(self, csv_path: Path, total_epochs: int, interval: float = 10.0):
        super().__init__(daemon=True)
        self.csv_path, self.total, self.interval = csv_path, total_epochs, interval
        self.seen = 0
        self.prev_cum = 0.0
        self.start_wall = time.time()
        self.prev_wall = self.start_wall
        self._halt = threading.Event()

    def poll(self) -> None:
        rows = read_rows(self.csv_path)
        for row in rows[self.seen:]:
            now = time.time()
            try:
                epoch = int(float(row["epoch"]))
                cum = float(row["time"]) if row.get("time") else now - self.start_wall
            except ValueError:
                continue
            delta = cum - self.prev_cum if row.get("time") else now - self.prev_wall
            self.prev_cum, self.prev_wall = cum, now
            done = self.seen + 1
            eta = (cum / done) * max(self.total - done, 0)
            print(f"[epoch time] epoch {epoch}/{self.total}: {delta:.0f}s this epoch, "
                  f"{cum / 60:.1f} min elapsed, ~{eta / 60:.1f} min left if all {self.total} epochs run",
                  flush=True)
            self.seen += 1

    def run(self) -> None:
        while not self._halt.wait(self.interval):
            self.poll()

    def finish(self) -> None:
        self._halt.set()
        self.poll()


def evaluate_test(best: Path, data: str, imgsz: int, batch: int, device: str, workers: int,
                  save_dir: Path, smoke: bool) -> dict:
    from ultralytics import YOLO

    # Validation outside training runs on a single GPU.
    eval_device = device.split(",")[0] if device.strip().lower() not in {"cpu", "mps"} else device
    # Per-GPU batch of the training run is batch/num_gpus; one GPU can take the full batch for inference.
    m = YOLO(str(best)).val(
        data=data, split="test", imgsz=imgsz, batch=batch, device=eval_device, workers=workers,
        project=str(save_dir), name="test", exist_ok=True, plots=True,
    )
    out = {
        "weights": str(best),
        "data": data,
        "split": "test (official RipVIS val split)",
        "imgsz": imgsz,
        "smoke_run": smoke,
        "box": {"mAP50": float(m.box.map50), "mAP50-95": float(m.box.map),
                "precision": float(m.box.mp), "recall": float(m.box.mr)},
        "mask": {"mAP50": float(m.seg.map50), "mAP50-95": float(m.seg.map),
                 "precision": float(m.seg.mp), "recall": float(m.seg.mr)},
    }
    path = save_dir / "test_metrics.json"
    path.write_text(json.dumps(out, indent=2) + "\n")

    print("\n=== Test-split metrics (best.pt) ===")
    print(f"{'':6s} {'mAP50':>8s} {'mAP50-95':>10s} {'P':>8s} {'R':>8s}")
    for k in ("box", "mask"):
        v = out[k]
        print(f"{k:6s} {v['mAP50']:8.4f} {v['mAP50-95']:10.4f} {v['precision']:8.4f} {v['recall']:8.4f}")
    print(f"saved {path}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=DEFAULT_DATA, help="data.yaml from prepare_yolo.py")
    ap.add_argument("--model", default="yolo11s-seg.pt", help="COCO-pretrained weights to start from")
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16, help="total batch size, split across the GPUs")
    ap.add_argument("--device", default="0,1", help='e.g. "0,1" for 2 GPUs, "0" for one')
    ap.add_argument("--patience", type=int, default=10, help="stop after this many epochs without improvement")
    ap.add_argument("--name", default="ripwatch_s")
    ap.add_argument("--project", default="/kaggle/working/runs")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--smoke", action="store_true",
                    help="2 epochs on 10%% of the training data, name suffixed _smoke")
    args = ap.parse_args()

    if args.smoke:
        args.epochs, args.name = 2, f"{args.name}_smoke"
    fraction = 0.1 if args.smoke else 1.0

    if not Path(args.data).is_file():
        sys.exit(f"ERROR: {args.data} not found. Run prepare_yolo.py first.")
    check_devices(args.device)

    os.environ.setdefault("WANDB_MODE", "disabled")  # never block on a W&B login prompt

    from ultralytics import YOLO

    project = Path(args.project)
    project.mkdir(parents=True, exist_ok=True)
    name = unique_name(project, args.name)
    if name != args.name:
        print(f"NOTE: {project / args.name} already exists, using {name} instead.")
    save_dir = project / name

    print(f"Training {args.model} on {args.data}")
    print(f"  epochs={args.epochs} fraction={fraction} imgsz={args.imgsz} batch={args.batch} "
          f"device={args.device} patience={args.patience} workers={args.workers}")
    print(f"  output: {save_dir}")

    timer = EpochTimer(save_dir / "results.csv", args.epochs)
    timer.start()
    t0 = time.time()
    model = YOLO(args.model)  # COCO-pretrained; augmentation settings are left at Ultralytics defaults
    try:
        model.train(
            data=args.data, epochs=args.epochs, imgsz=args.imgsz, batch=args.batch, device=args.device,
            patience=args.patience, workers=args.workers, project=str(project), name=name,
            exist_ok=True,  # name is already unique; this keeps the output dir exactly where we expect
            fraction=fraction, pretrained=True, save=True, save_period=1, plots=True,
        )
    finally:
        timer.finish()
    print(f"\nTraining finished in {(time.time() - t0) / 60:.1f} min")

    best = save_dir / "weights" / "best.pt"
    if not best.is_file():
        sys.exit(f"ERROR: {best} not found, so training did not finish. Check the log above.")
    evaluate_test(best, args.data, args.imgsz, args.batch, args.device, args.workers, save_dir, args.smoke)


if __name__ == "__main__":
    main()
