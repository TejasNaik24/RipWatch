"""Shared paths and helpers for baseline_vlm.py and eval_compare.py."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
RESULTS = REPO / "ml" / "results"
EVAL_FRAMES = RESULTS / "eval_frames.txt"
BASELINE_RAW = RESULTS / "baseline_raw.jsonl"
COMPARISON_MD = RESULTS / "comparison.md"
METRICS_JSON = REPO / "web" / "public" / "data" / "metrics.json"
DEFAULT_TEST_DIR = Path("/kaggle/working/yolo/test")

FRAME_RE = re.compile(r"^RipVIS-(NR-)?(\d+)_(\d+)$", re.IGNORECASE)

Box = list[float]  # normalized [x1, y1, x2, y2]


def load_env() -> None:
    """Load ml/.env if python-dotenv is installed. Variables already set in the environment win."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(REPO / "ml" / ".env", override=False)


def gemini_key() -> str:
    load_env()
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        try:
            from kaggle_secrets import UserSecretsClient

            key = (UserSecretsClient().get_secret("GEMINI_API_KEY") or "").strip()
        except Exception:  # not on Kaggle, or the secret is not attached to this notebook
            key = ""
    if not key:
        sys.exit("ERROR: GEMINI_API_KEY not found. Put it in ml/.env (see ml/.env.example), export it, "
                 "or add a Kaggle Secret named GEMINI_API_KEY and attach it to the notebook.")
    return key


def video_of(stem: str) -> tuple[str, str] | None:
    """("RIP" | "NR", zero-padded video id) for a RipVIS frame name, else None."""
    m = FRAME_RE.match(stem)
    if not m:
        return None
    return ("NR" if m.group(1) else "RIP", m.group(2).zfill(3))


def read_eval_frames() -> list[str]:
    return [ln.strip() for ln in EVAL_FRAMES.read_text().splitlines() if ln.strip()]


def write_eval_frames(frames: list[str]) -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    EVAL_FRAMES.write_text("\n".join(frames) + "\n")


def label_path(test_dir: Path, frame: str) -> Path:
    return test_dir / "labels" / f"{Path(frame).stem}.txt"


def gt_boxes(path: Path) -> list[Box]:
    """Ground-truth boxes from a YOLO-seg label file: the min/max box of each polygon line."""
    if not path.exists():
        return []
    boxes = []
    for line in path.read_text().splitlines():
        vals = line.split()[1:]
        if len(vals) < 6:
            continue
        xs, ys = [float(v) for v in vals[0::2]], [float(v) for v in vals[1::2]]
        boxes.append([min(xs), min(ys), max(xs), max(ys)])
    return boxes
