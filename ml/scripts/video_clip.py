"""Shared clip handling for infer_video.py and baseline_video.py.

Both scripts take the same --video/--clip-id/--start/--end arguments and write the demo clip to
web/public/data/clips/{clipId}.mp4. Masks are always computed from that output clip (never from the
source video), so mask frame i is clip frame i by construction.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import common  # noqa: E402

DEFAULT_DATA_DIR = common.REPO / "web" / "public" / "data"
LOCAL_DIR = common.REPO / "ml" / "data" / "demo"  # git-ignored: sidecars and extracted frames
CONTRACT_KEYS = ("clipId", "model", "smoothed", "fps", "width", "height", "frames")


def add_clip_args(ap: argparse.ArgumentParser) -> None:
    ap.add_argument("--video", type=Path, required=True, help="source beach video")
    ap.add_argument("--clip-id", required=True, help="e.g. clip1_obvious (see notes/contract.md)")
    ap.add_argument("--start", type=float, default=None, help="trim start, seconds")
    ap.add_argument("--end", type=float, default=None, help="trim end, seconds")
    ap.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR,
                    help="output root with clips/ and masks/ (default: web/public/data)")
    ap.add_argument("--ffmpeg", default=None, help="ffmpeg binary (default: the one bundled by imageio-ffmpeg)")


def ffmpeg_exe(override: str | None = None) -> str:
    """Prefer the imageio-ffmpeg binary, so laptop and Kaggle cut the same frames from the same source."""
    if override:
        return override
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ERROR: ffmpeg not found. pip install imageio-ffmpeg, or pass --ffmpeg /path/to/ffmpeg.")
    return exe


# ---------------------------------------------------------------- reading

def open_video(path: Path):
    import cv2

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        sys.exit(f"ERROR: cannot open video {path}")
    return cap


def probe(path: Path) -> tuple[int, int, float, int]:
    """(width, height, fps, n_frames). fps is the container rate unrounded (30000/1001 stays 29.97002997...).
    n_frames is counted by decoding, not taken from the header estimate."""
    import cv2

    cap = open_video(path)
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    ok, frame = cap.read()
    if not ok:
        sys.exit(f"ERROR: no frames in {path}")
    h, w = frame.shape[:2]
    n = 1
    while cap.grab():
        n += 1
    cap.release()
    if not fps > 0:
        sys.exit(f"ERROR: could not read fps from {path}")
    return w, h, fps, n


def iter_frames(path: Path):
    """Yields (i, bgr frame) for every frame, i from 0."""
    cap = open_video(path)
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        yield i, frame
        i += 1
    cap.release()


# ---------------------------------------------------------------- clip

def _sidecar(clip_id: str) -> Path:
    return LOCAL_DIR / "clips" / f"{clip_id}.json"


def prepare_clip(args) -> Path:
    """Writes {data-dir}/clips/{clipId}.mp4: a frame-accurate trim when --start/--end are given, else a copy.
    A matching sidecar means the clip is already there and is reused, so both scripts share one clip."""
    src = args.video.resolve()
    if not src.exists():
        sys.exit(f"ERROR: video not found: {src}")
    if args.start is not None and args.start < 0:
        sys.exit("ERROR: --start must be >= 0")
    if args.start is not None and args.end is not None and args.end <= args.start:
        sys.exit("ERROR: --end must be after --start")

    out = (args.data_dir / "clips" / f"{args.clip_id}.mp4").resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    st = src.stat()
    key = {"source": str(src), "size": st.st_size, "mtime_ns": st.st_mtime_ns,
           "start": args.start, "end": args.end, "out": str(out)}

    side = _sidecar(args.clip_id)
    if side.exists() and out.exists():
        try:
            prev = json.loads(side.read_text())
        except json.JSONDecodeError:
            prev = {}
        if prev.get("key") == key and prev.get("out_size") == out.stat().st_size:
            print(f"reusing {out} (same source and trim)")
            return out

    trimming = args.start is not None or args.end is not None
    if trimming:
        cmd = [ffmpeg_exe(args.ffmpeg), "-y", "-loglevel", "error"]
        if args.start:
            cmd += ["-ss", f"{args.start:.6f}"]
        cmd += ["-i", str(src)]
        if args.end is not None:
            cmd += ["-t", f"{args.end - (args.start or 0.0):.6f}"]
        # Re-encode (not stream copy) so the cut is frame-accurate and timestamps restart at 0.
        cmd += ["-map", "0:v:0", "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                "-pix_fmt", "yuv420p", "-fps_mode", "cfr", "-movflags", "+faststart", str(out)]
        print(f"trimming {src.name} [{args.start or 0:g}s, {'end' if args.end is None else f'{args.end:g}s'}] -> {out}")
        subprocess.run(cmd, check=True)
    elif src != out:
        if src.suffix.lower() != ".mp4":
            print(f"WARNING: {src.name} is not an .mp4; the browser may not play it. Pass --start 0 to re-encode.")
        print(f"copying {src.name} -> {out}")
        shutil.copyfile(src, out)

    side.parent.mkdir(parents=True, exist_ok=True)
    side.write_text(json.dumps({"key": key, "out_size": out.stat().st_size}, indent=2) + "\n")
    return out


def fingerprint(args, n_frames: int, fps: float) -> str:
    """Machine-independent ID of the clip content (same on laptop and Kaggle), for response caches."""
    st = args.video.stat()
    blob = json.dumps({"source": args.video.name, "size": st.st_size, "start": args.start, "end": args.end,
                       "frames": n_frames, "fps": round(fps, 9)}, sort_keys=True)
    return hashlib.sha1(blob.encode()).hexdigest()[:12]


# ---------------------------------------------------------------- output

def write_masks(data_dir: Path, clip_id: str, source: str, doc: dict) -> Path:
    """masks/{clipId}.{source}.json in contract key order. Never writes a "fake" key."""
    ordered = {k: doc[k] for k in CONTRACT_KEYS if k in doc}
    ordered.update({k: v for k, v in doc.items() if k not in ordered and k != "fake"})
    path = data_dir / "masks" / f"{clip_id}.{source}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ordered, separators=(",", ":")))
    return path
