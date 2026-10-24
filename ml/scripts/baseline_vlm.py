#!/usr/bin/env python3
"""Zero-shot Gemini baseline on a fixed sample of held-out frames.

    !python ml/scripts/baseline_vlm.py                 # rerun the same cell to resume

1. Samples the eval frames from /kaggle/working/yolo/test (the official RipVIS val split):
   150 rip frames spread across as many rip videos as possible, plus 50 RipVIS-NR frames,
   fixed seed. Saved to ml/results/eval_frames.txt and reused on later runs (and by
   eval_compare.py), so both models always see the same frames.
2. Sends each frame to Gemini with one fixed prompt and logs every raw response to
   ml/results/baseline_raw.jsonl. Frames that already have a response are skipped.

The API key comes from ml/.env, the environment, or a Kaggle Secret named GEMINI_API_KEY.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import common  # noqa: E402

DEFAULT_MODEL = "gemini-3.5-flash-lite"  # free-tier quota; eval_compare.py names the baseline from this id
PROMPT_VERSION = "v1"  # bump if PROMPT changes, so old responses are not mixed with new ones
PROMPT = (
    "This is a single frame from a camera looking at a beach. "
    "Is there a rip current visible in this image? A rip current is a narrow channel of water "
    "flowing away from the shore, often seen as a gap in the breaking waves, darker or calmer water, "
    "or a plume of sediment or foam moving out to sea.\n"
    "Answer with JSON only, exactly in this format:\n"
    '{"rip": true, "boxes": [[ymin, xmin, ymax, xmax], ...]}\n'
    "with one box per rip current and coordinates normalized to 0-1000. "
    'If there is no rip current, answer {"rip": false, "boxes": []}.'
)
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
RETRY_CODES = {429, 500, 503, 504}
BACKOFF_START, BACKOFF_MAX = 30.0, 300.0


class QuotaExhausted(Exception):
    pass


# ---------------------------------------------------------------- sampling

def spread_sample(groups: dict, n: int, rng: random.Random, label: str) -> list[str]:
    """Round-robin over videos (in shuffled order), one random frame per video per round."""
    vids = sorted(groups)
    rng.shuffle(vids)
    pools = {v: rng.sample(sorted(groups[v]), len(groups[v])) for v in vids}
    out: list[str] = []
    while len(out) < n and any(pools.values()):
        for v in vids:
            if pools[v] and len(out) < n:
                out.append(pools[v].pop())
    used = len({common.video_of(Path(f).stem) for f in out})
    print(f"sampled {len(out)} {label} frames from {used} of {len(vids)} videos")
    if len(out) < n:
        print(f"WARNING: wanted {n} {label} frames, only {len(out)} available")
    return out


def sample_frames(test_dir: Path, n_rip: int, n_nr: int, seed: int) -> list[str]:
    groups: dict[str, dict] = {"RIP": defaultdict(list), "NR": defaultdict(list)}
    for p in sorted((test_dir / "images").iterdir()):
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        v = common.video_of(p.stem)
        if v is None:
            continue
        if v[0] == "RIP" and not common.gt_boxes(common.label_path(test_dir, p.name)):
            continue  # a rip frame must have at least one annotated rip
        groups[v[0]][v].append(p.name)
    rng = random.Random(seed)
    rip = spread_sample(groups["RIP"], n_rip, rng, "rip")
    nr = spread_sample(groups["NR"], n_nr, rng, "no-rip")
    return sorted(rip + nr)


def get_frames(test_dir: Path, n_rip: int, n_nr: int, seed: int) -> list[str]:
    if common.EVAL_FRAMES.exists():
        frames = common.read_eval_frames()
        print(f"reusing {len(frames)} frames from {common.EVAL_FRAMES}")
    else:
        frames = sample_frames(test_dir, n_rip, n_nr, seed)
        common.write_eval_frames(frames)
        print(f"wrote {len(frames)} frames to {common.EVAL_FRAMES}")
    missing = [f for f in frames if not (test_dir / "images" / f).exists()]
    if missing:
        sys.exit(f"ERROR: {len(missing)} eval frames are not in {test_dir / 'images'}, e.g. {missing[:3]}. "
                 "Run prepare_yolo.py first, or delete eval_frames.txt to resample.")
    return frames


# ---------------------------------------------------------------- parsing

def _extract_json(text: str):
    s = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", text.strip(), flags=re.IGNORECASE)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    for pattern in (r"\{.*\}", r"\[.*\]"):
        m = re.search(pattern, s, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                continue
    raise ValueError("no JSON object found")


def to_xyxy(box) -> list[float] | None:
    """Gemini [ymin, xmin, ymax, xmax] on 0-1000 -> normalized [x1, y1, x2, y2]. None if unusable."""
    if isinstance(box, dict):
        box = box.get("box_2d", box.get("box"))
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return None
    try:
        v = [float(c) for c in box]
    except (TypeError, ValueError):
        return None
    # A box entirely inside [0, 1] on a 0-1000 scale would be invisible, so treat it as already 0-1.
    scale = 1.0 if max(v) <= 1.0 else 1000.0
    ymin, xmin, ymax, xmax = (min(max(c / scale, 0.0), 1.0) for c in v)
    x1, x2 = sorted((xmin, xmax))
    y1, y2 = sorted((ymin, ymax))
    if x2 - x1 <= 0 or y2 - y1 <= 0:
        return None
    return [x1, y1, x2, y2]


def parse_response(text: str | None) -> tuple[dict | None, str | None]:
    """Returns (parsed, error). parsed = {"rip": bool, "boxes_xyxy": [...], "dropped_boxes": int}."""
    if not text or not text.strip():
        return None, "empty response"
    try:
        obj = _extract_json(text)
    except ValueError as e:
        return None, str(e)
    if isinstance(obj, list):
        rip, raw_boxes = None, obj
    elif isinstance(obj, dict):
        rip, raw_boxes = obj.get("rip"), obj.get("boxes", [])
    else:
        return None, f"unexpected JSON type {type(obj).__name__}"
    if raw_boxes is None:
        raw_boxes = []
    if not isinstance(raw_boxes, list):
        return None, "'boxes' is not a list"
    boxes = [b for b in (to_xyxy(x) for x in raw_boxes) if b]
    if isinstance(rip, str):
        rip = rip.strip().lower() in {"true", "yes", "1"}
    elif not isinstance(rip, bool):
        rip = bool(boxes)
    return {"rip": rip, "boxes_xyxy": boxes, "dropped_boxes": len(raw_boxes) - len(boxes)}, None


# ---------------------------------------------------------------- API + resume

def load_done(model: str) -> set[str]:
    done = set()
    if not common.BASELINE_RAW.exists():
        return done
    for line in common.BASELINE_RAW.read_text().splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("model") == model and rec.get("prompt_version") == PROMPT_VERSION and not rec.get("error"):
            done.add(rec["frame"])
    return done


def call_gemini(client, model: str, image: Path, max_retries: int) -> str | None:
    from google.genai import errors, types

    mime = "image/png" if image.suffix.lower() == ".png" else "image/jpeg"
    contents = [PROMPT, types.Part.from_bytes(data=image.read_bytes(), mime_type=mime)]
    # Temperature and thinking are left at their defaults: Google advises against lowering
    # temperature on Gemini 3 models (it can cause looping and worse results).
    config = types.GenerateContentConfig(response_mime_type="application/json")
    wait = BACKOFF_START
    for attempt in range(max_retries + 1):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config).text
        except errors.APIError as e:
            if e.code not in RETRY_CODES:
                raise
            if attempt == max_retries:
                if e.code == 429:
                    raise QuotaExhausted(str(e)) from e
                raise
            print(f"    HTTP {e.code}, waiting {wait:.0f}s (retry {attempt + 1}/{max_retries})", flush=True)
            time.sleep(wait)
            wait = min(wait * 2, BACKOFF_MAX)
    return None


def log(rec: dict) -> None:
    common.RESULTS.mkdir(parents=True, exist_ok=True)
    with common.BASELINE_RAW.open("a") as f:
        f.write(json.dumps(rec) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--test-dir", type=Path, default=common.DEFAULT_TEST_DIR)
    ap.add_argument("--model", default=DEFAULT_MODEL, help="Gemini model code (check AI Studio for free-tier access)")
    ap.add_argument("--delay", type=float, default=6.0, help="seconds to wait between requests")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--n-rip", type=int, default=150)
    ap.add_argument("--n-nr", type=int, default=50)
    ap.add_argument("--max-retries", type=int, default=8, help="retries per frame on 429/5xx, with backoff")
    args = ap.parse_args()

    frames = get_frames(args.test_dir, args.n_rip, args.n_nr, args.seed)
    done = load_done(args.model)
    todo = [f for f in frames if f not in done]
    print(f"{args.model} / prompt {PROMPT_VERSION}: {len(frames) - len(todo)} done, {len(todo)} to go")
    if not todo:
        return

    from google import genai

    client = genai.Client(api_key=common.gemini_key())
    stats = {"ok": 0, "parse_error": 0, "error": 0}
    for i, frame in enumerate(todo, 1):
        rec = {"frame": frame, "model": args.model, "prompt_version": PROMPT_VERSION,
               "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "raw": None, "parsed": None, "parse_error": None, "error": None}
        try:
            rec["raw"] = call_gemini(client, args.model, args.test_dir / "images" / frame, args.max_retries)
            rec["parsed"], rec["parse_error"] = parse_response(rec["raw"])
        except QuotaExhausted as e:
            print(f"\nStill rate limited after {args.max_retries} retries ({e}).\n"
                  f"Progress is saved. Rerun later to resume ({len(todo) - i + 1} frames left).")
            sys.exit(2)
        except Exception as e:  # logged and retried on the next run
            rec["error"] = f"{type(e).__name__}: {e}"
        log(rec)

        if rec["error"]:
            stats["error"] += 1
            status = f"ERROR {rec['error'][:80]}"
        elif rec["parse_error"]:
            stats["parse_error"] += 1
            status = f"unparseable ({rec['parse_error']}), counted as no detection"
        else:
            stats["ok"] += 1
            status = f"rip={rec['parsed']['rip']} boxes={len(rec['parsed']['boxes_xyxy'])}"
        print(f"[{i}/{len(todo)}] {frame}: {status}", flush=True)
        if i < len(todo):
            time.sleep(args.delay)

    print(f"\ndone: {stats['ok']} parsed, {stats['parse_error']} unparseable, {stats['error']} API errors "
          f"(errors are retried on the next run). Log: {common.BASELINE_RAW}")


if __name__ == "__main__":
    main()
