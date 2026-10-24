#!/usr/bin/env python3
"""Run the fine-tuned RipWatch YOLO11-seg model on every frame of a beach video and write the demo files.

    python ml/scripts/infer_video.py --weights best.pt --video beach.mp4 --clip-id clip1_obvious --start 12 --end 32

Writes web/public/data/clips/{clipId}.mp4 (trimmed, downscaled to --max-width or copied, see video_clip.py) and
web/public/data/masks/{clipId}.ripwatch.json per notes/contract.md.

Temporal smoothing (default on): a per-pixel rip-probability heatmap at reduced resolution is updated
with an exponential moving average each frame and thresholded with hysteresis (a pixel turns on above
--on-thresh and stays on until it drops below --off-thresh). Polygons come from OpenCV contours of that
mask, and each region's conf is the mean heatmap value inside it. --no-smooth writes the model's raw
per-frame polygons instead. Runs on CPU (laptop) or GPU (Kaggle).
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import video_clip  # noqa: E402

MODEL_NAME = "ripwatch-yolo11s-seg"
RED_BGR = (59, 59, 255)


# ---------------------------------------------------------------- polygons

def simplify(contour, frac: float):
    """approxPolyDP with epsilon as a fraction of the perimeter. contour: (N, 1, 2) array."""
    import cv2

    if frac <= 0:
        return contour
    return cv2.approxPolyDP(contour, frac * cv2.arcLength(contour, True), True)


def to_pixels(contour, sx: float, sy: float, w: int, h: int) -> list[list[int]]:
    pts = contour.reshape(-1, 2)
    return [[int(round(min(max(x * sx, 0), w))), int(round(min(max(y * sy, 0), h)))] for x, y in pts]


def raw_detections(result, w: int, h: int, simplify_frac: float) -> list[dict]:
    """The model's own polygons for this frame, highest conf first."""
    import numpy as np

    if result.masks is None or result.boxes is None:
        return []
    confs = result.boxes.conf.cpu().numpy()
    out = []
    for poly, conf in zip(result.masks.xy, confs):
        if len(poly) < 3:
            continue
        c = simplify(np.asarray(poly, dtype=np.float32).reshape(-1, 1, 2), simplify_frac)
        if len(c) < 3:
            continue
        out.append({"polygon": to_pixels(c, 1.0, 1.0, w, h), "conf": round(float(conf), 3)})
    return sorted(out, key=lambda d: -d["conf"])


class Smoother:
    """EMA heatmap + hysteresis threshold at reduced resolution."""

    def __init__(self, w: int, h: int, args):
        import cv2
        import numpy as np

        self.w, self.h = w, h
        self.scale = min(1.0, args.heat_size / max(w, h))
        self.hw, self.hh = max(1, round(w * self.scale)), max(1, round(h * self.scale))
        self.sx, self.sy = w / self.hw, h / self.hh
        self.heat = np.zeros((self.hh, self.hw), np.float32)
        self.on = np.zeros((self.hh, self.hw), bool)
        self.alpha, self.on_t, self.off_t = args.ema_alpha, args.on_thresh, args.off_thresh
        self.min_area = args.min_area * self.hw * self.hh
        self.simplify_frac = args.simplify
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    def update(self, result) -> list[dict]:
        import cv2
        import numpy as np

        # Instantaneous map: each pixel gets the highest conf of any predicted mask covering it.
        p = np.zeros_like(self.heat)
        if result.masks is not None and result.boxes is not None:
            dets = sorted(zip(result.masks.xy, result.boxes.conf.cpu().numpy()), key=lambda d: d[1])
            for poly, conf in dets:  # ascending, so higher conf paints last and wins overlaps
                if len(poly) >= 3:
                    pts = np.round(np.asarray(poly, np.float32) * self.scale).astype(np.int32)
                    cv2.fillPoly(p, [pts], float(conf))

        self.heat *= 1.0 - self.alpha
        self.heat += self.alpha * p
        self.on = (self.heat >= self.on_t) | (self.on & (self.heat >= self.off_t))

        mask = cv2.morphologyEx(self.on.astype(np.uint8), cv2.MORPH_CLOSE, self.kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        out = []
        for c in contours:
            if cv2.contourArea(c) < self.min_area:
                continue
            region = np.zeros_like(mask)
            cv2.drawContours(region, [c], -1, 1, thickness=cv2.FILLED)
            conf = cv2.mean(self.heat, mask=region)[0]
            s = simplify(c.astype(np.float32) + 0.5, self.simplify_frac)  # +0.5: pixel centres
            if len(s) < 3:
                continue
            out.append({"polygon": to_pixels(s, self.sx, self.sy, self.w, self.h), "conf": round(conf, 3)})
        return sorted(out, key=lambda d: -d["conf"])


# ---------------------------------------------------------------- render

class Renderer:
    """Pipes overlay frames to ffmpeg (H.264, exact source fps)."""

    def __init__(self, path: Path, w: int, h: int, fps: float, ffmpeg: str):
        rate = Fraction(fps).limit_denominator(100000)
        path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}",
               "-r", f"{rate.numerator}/{rate.denominator}", "-i", "-", "-an", "-c:v", "libx264", "-crf", "20",
               "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        self.w = w

    def write(self, frame, dets: list[dict]) -> None:
        import cv2
        import numpy as np

        if dets:
            polys = [np.array(d["polygon"], np.int32) for d in dets]
            overlay = frame.copy()
            cv2.fillPoly(overlay, polys, RED_BGR)
            frame = cv2.addWeighted(overlay, 0.3, frame, 0.7, 0)
            t = max(2, round(self.w / 640))
            cv2.polylines(frame, polys, True, RED_BGR, t, cv2.LINE_AA)
            for d, poly in zip(dets, polys):
                x, y = int(poly[:, 0].mean()), int(poly[:, 1].min()) - 3 * t
                label = f"RIP {round(d['conf'] * 100)}%"
                fs = 0.5 * t
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, fs, t)
                x = min(max(x - tw // 2, 0), frame.shape[1] - tw)
                y = max(y, th + 2)
                cv2.rectangle(frame, (x - 4, y - th - 4), (x + tw + 4, y + 4), (10, 4, 4), cv2.FILLED)
                cv2.putText(frame, label, (x, y), cv2.FONT_HERSHEY_SIMPLEX, fs, (215, 215, 255), t, cv2.LINE_AA)
        self.proc.stdin.write(frame.tobytes())

    def close(self) -> None:
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            sys.exit("ERROR: ffmpeg failed while rendering")


# ---------------------------------------------------------------- main

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--weights", required=True, help="fine-tuned YOLO11-seg best.pt")
    video_clip.add_clip_args(ap)
    ap.add_argument("--conf", type=float, default=0.25, help="YOLO confidence threshold")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--device", default=None, help="e.g. cpu, 0 (default: Ultralytics picks CUDA if available)")
    ap.add_argument("--no-smooth", action="store_true", help="write raw per-frame polygons (no temporal smoothing)")
    ap.add_argument("--render", type=Path, default=None, help="also write an mp4 with the overlay baked in")
    g = ap.add_argument_group("smoothing")
    g.add_argument("--ema-alpha", type=float, default=0.3, help="weight of the newest frame in the heatmap EMA")
    g.add_argument("--on-thresh", type=float, default=0.45, help="a pixel turns on when the heatmap reaches this")
    g.add_argument("--off-thresh", type=float, default=0.25, help="an on pixel turns off below this")
    g.add_argument("--heat-size", type=int, default=320, help="heatmap long side in pixels")
    g.add_argument("--min-area", type=float, default=0.002, help="drop regions smaller than this fraction of the frame")
    g.add_argument("--simplify", type=float, default=0.004, help="polygon simplification, fraction of perimeter")
    args = ap.parse_args()
    if not 0 < args.ema_alpha <= 1:
        sys.exit("ERROR: --ema-alpha must be in (0, 1]")
    if args.off_thresh > args.on_thresh:
        sys.exit("ERROR: --off-thresh must be <= --on-thresh")
    if not Path(args.weights).exists():
        sys.exit(f"ERROR: weights not found: {args.weights}")

    clip = video_clip.prepare_clip(args)
    w, h, fps, n = video_clip.probe(clip)
    print(f"clip: {w}x{h}, {fps!r} fps, {n} frames ({n / fps:.2f}s)")

    from ultralytics import YOLO

    model = YOLO(args.weights)
    kw = {"conf": args.conf, "imgsz": args.imgsz, "verbose": False}
    if args.device is not None:
        kw["device"] = args.device

    smoother = None if args.no_smooth else Smoother(w, h, args)
    renderer = Renderer(args.render, w, h, fps, video_clip.ffmpeg_exe(args.ffmpeg)) if args.render else None
    frames, hits = [], 0
    t0 = last = time.time()
    for i, frame in video_clip.iter_frames(clip):
        result = model(frame, **kw)[0]
        dets = smoother.update(result) if smoother else raw_detections(result, w, h, args.simplify)
        frames.append({"i": i, "detections": dets})
        hits += bool(dets)
        if renderer:
            renderer.write(frame, dets)
        now = time.time()
        if now - last >= 2 or i + 1 == n:
            rate = (i + 1) / (now - t0)
            print(f"  {i + 1}/{n} frames, {rate:.1f} frames/s, ~{(n - i - 1) / rate:.0f}s left", flush=True)
            last = now
    if renderer:
        renderer.close()

    doc = {"clipId": args.clip_id, "model": MODEL_NAME, "smoothed": smoother is not None,
           "fps": fps, "width": w, "height": h, "frames": frames}
    path = video_clip.write_masks(args.data_dir, args.clip_id, "ripwatch", doc)
    print(f"\nwrote {path}: {len(frames)} frames, {hits} with detections, smoothed={doc['smoothed']}")
    if args.render:
        print(f"rendered {args.render}")


if __name__ == "__main__":
    main()
