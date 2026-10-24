#!/usr/bin/env python3
"""Zero-shot Gemini baseline on a demo clip, for the /compare screen.

    python ml/scripts/baseline_video.py --video beach.mp4 --clip-id clip2_sneaky --start 5 --end 25

Same clip handling as infer_video.py (video_clip.py), so both mask files line up with one clip.
Sends one frame every --every seconds to Gemini with the same prompt, model flag, box conversion,
retry and rate-limit logic as baseline_vlm.py (imported, not copied). Each answer's boxes are held
until the next sampled frame. Writes web/public/data/masks/{clipId}.baseline.json per notes/contract.md.

Every raw response is cached in ml/results/baseline_video/{clipId}.jsonl, so reruns skip frames that
already have an answer and resume after a rate-limit stop. Gemini gives no confidence, so every box
gets conf 1.0.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import baseline_vlm  # noqa: E402
import common  # noqa: E402
import video_clip  # noqa: E402

CACHE_DIR = common.RESULTS / "baseline_video"
BOX_CONF = 1.0


def sample_indices(n_frames: int, fps: float, every: float) -> list[int]:
    out, k = [], 0
    while True:
        i = round(k * every * fps)
        if i >= n_frames:
            return out
        if not out or i != out[-1]:
            out.append(i)
        k += 1


def extract_frames(clip: Path, indices: list[int], out_dir: Path) -> dict[int, Path]:
    """JPEGs of the sampled frames (call_gemini takes an image path). Kept in git-ignored ml/data/."""
    import cv2

    paths = {i: out_dir / f"f{i:06d}.jpg" for i in indices}
    missing = {i for i, p in paths.items() if not p.exists()}
    if missing:
        out_dir.mkdir(parents=True, exist_ok=True)
        for i, frame in video_clip.iter_frames(clip):
            if i in missing:
                cv2.imwrite(str(paths[i]), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                missing.discard(i)
                if not missing:
                    break
    if missing:
        sys.exit(f"ERROR: could not extract frames {sorted(missing)[:5]} from {clip}")
    return paths


def load_cache(path: Path, model: str, fp: str) -> dict[int, dict]:
    """Latest error-free record per frame index for this model, prompt version and clip."""
    done: dict[int, dict] = {}
    if not path.exists():
        return done
    for line in path.read_text().splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if (rec.get("model") == model and rec.get("prompt_version") == baseline_vlm.PROMPT_VERSION
                and rec.get("clip_fingerprint") == fp and not rec.get("error")):
            done[rec["frame"]] = rec
    return done


def to_pixel_boxes(rec: dict, w: int, h: int) -> list[dict]:
    """Unparseable answers count as no detection, as in baseline_vlm.py."""
    parsed = rec.get("parsed") or {}
    out = []
    for x1, y1, x2, y2 in parsed.get("boxes_xyxy", []):
        box = [round(x1 * w), round(y1 * h), round(x2 * w), round(y2 * h)]
        if box[2] > box[0] and box[3] > box[1]:
            out.append({"box": box, "conf": BOX_CONF})
    return out


def hold_frames(n_frames: int, samples: list[int], recs: dict[int, dict], w: int, h: int) -> list[dict]:
    """Frame i shows the boxes of the latest sampled frame <= i."""
    frames, k, current = [], -1, []
    for i in range(n_frames):
        while k + 1 < len(samples) and samples[k + 1] <= i:
            k += 1
            current = to_pixel_boxes(recs[samples[k]], w, h)
        frames.append({"i": i, "detections": current})
    return frames


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    video_clip.add_clip_args(ap)
    ap.add_argument("--every", type=float, default=1.0, help="seconds between frames sent to Gemini")
    ap.add_argument("--model", default=baseline_vlm.DEFAULT_MODEL,
                    help="Gemini model code (check AI Studio for free-tier access)")
    ap.add_argument("--delay", type=float, default=6.0, help="seconds to wait between requests")
    ap.add_argument("--max-retries", type=int, default=8, help="retries per frame on 429/5xx, with backoff")
    args = ap.parse_args()
    if args.every <= 0:
        sys.exit("ERROR: --every must be > 0")

    clip = video_clip.prepare_clip(args)
    w, h, fps, n = video_clip.probe(clip)
    fp = video_clip.fingerprint(args, n, fps)
    samples = sample_indices(n, fps, args.every)
    print(f"clip: {w}x{h}, {fps!r} fps, {n} frames; {len(samples)} sampled frames (every {args.every:g}s)")

    cache = CACHE_DIR / f"{args.clip_id}.jsonl"
    done = load_cache(cache, args.model, fp)
    todo = [i for i in samples if i not in done]
    print(f"{args.model} / prompt {baseline_vlm.PROMPT_VERSION}: {len(samples) - len(todo)} cached, {len(todo)} to go")

    if todo:
        from google import genai

        images = extract_frames(clip, todo, video_clip.LOCAL_DIR / args.clip_id / fp)
        client = genai.Client(api_key=common.gemini_key())
        cache.parent.mkdir(parents=True, exist_ok=True)
        for k, i in enumerate(todo, 1):
            rec = {"clip_id": args.clip_id, "frame": i, "t": round(i / fps, 3), "clip_fingerprint": fp,
                   "model": args.model, "prompt_version": baseline_vlm.PROMPT_VERSION,
                   "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   "raw": None, "parsed": None, "parse_error": None, "error": None}
            try:
                rec["raw"] = baseline_vlm.call_gemini(client, args.model, images[i], args.max_retries)
                rec["parsed"], rec["parse_error"] = baseline_vlm.parse_response(rec["raw"])
            except baseline_vlm.QuotaExhausted as e:
                print(f"\nStill rate limited after {args.max_retries} retries ({e}).\n"
                      f"Progress is saved. Rerun later to resume ({len(todo) - k + 1} frames left).")
                sys.exit(2)
            except Exception as e:  # logged and retried on the next run
                rec["error"] = f"{type(e).__name__}: {e}"
            with cache.open("a") as f:
                f.write(json.dumps(rec) + "\n")
            if rec["error"]:
                status = f"ERROR {rec['error'][:80]}"
            elif rec["parse_error"]:
                status = f"unparseable ({rec['parse_error']}), counted as no detection"
            else:
                status = f"rip={rec['parsed']['rip']} boxes={len(rec['parsed']['boxes_xyxy'])}"
            print(f"[{k}/{len(todo)}] frame {i} ({rec['t']}s): {status}", flush=True)
            if k < len(todo):
                time.sleep(args.delay)
        done = load_cache(cache, args.model, fp)

    missing = [i for i in samples if i not in done]
    if missing:
        sys.exit(f"\n{len(missing)} sampled frames still have no answer (API errors, retried on the next run): "
                 f"{missing[:10]}. {args.clip_id}.baseline.json was not written.")

    frames = hold_frames(n, samples, done, w, h)
    doc = {"clipId": args.clip_id, "model": args.model, "fps": fps, "width": w, "height": h, "frames": frames}
    path = video_clip.write_masks(args.data_dir, args.clip_id, "baseline", doc)
    hits = sum(bool(f["detections"]) for f in frames)
    print(f"\nwrote {path}: {n} frames, {hits} with boxes. Raw responses: {cache}")


if __name__ == "__main__":
    main()
