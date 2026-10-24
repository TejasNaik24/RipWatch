#!/usr/bin/env python3
"""Score the zero-shot Gemini baseline and fine-tuned RipWatch YOLO on the same held-out frames.

    !python ml/scripts/eval_compare.py --weights /kaggle/input/<dataset>/best.pt

Uses the frames in ml/results/eval_frames.txt (written by baseline_vlm.py) and the Gemini
responses in ml/results/baseline_raw.jsonl, runs the YOLO weights on the same frames, and
scores both with the same function:
  (a) image level: "is there a rip?"
  (b) box level: greedy matching at IoU >= 0.5 against the boxes around the labelled polygons
Writes web/public/data/metrics.json (box level, per notes/contract.md) and ml/results/comparison.md.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import common  # noqa: E402
from baseline_vlm import DEFAULT_MODEL, PROMPT_VERSION  # noqa: E402

RIPWATCH_NAME = "RipWatch (fine-tuned YOLO11s-seg)"
IOU_THRESHOLD = 0.5



def gemini_display_name(model_id: str) -> str:
    """Display name from the model id actually used: "gemini-3.5-flash-lite" -> "Gemini 3.5 Flash Lite (zero-shot)".
    Keeps the first version number, drops later numeric or "latest" tokens (dates, revisions).
    web/lib/clips.ts (geminiDisplayName) uses the same rule for the /compare titles."""
    tokens = [t for t in model_id.strip().removeprefix("models/").split("-") if t]
    words, seen_version = [], False
    for t in tokens:
        if re.fullmatch(r"\d+(\.\d+)*", t):
            if not seen_version:
                words.append(t)
                seen_version = True
        elif t.lower() != "latest":
            words.append(t.capitalize())
    return f"{' '.join(words)} (zero-shot)"


# A prediction per frame: (rip present?, boxes in matching order, normalized [x1, y1, x2, y2]).
Pred = tuple[bool, list[common.Box]]


# ---------------------------------------------------------------- scoring (shared by both models)

def iou(a: common.Box, b: common.Box) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def match(pred: list[common.Box], gt: list[common.Box]) -> tuple[int, int, int]:
    """Greedy: each prediction, in order, takes the unmatched GT box with the highest IoU if >= 0.5."""
    free = list(range(len(gt)))
    tp = 0
    for p in pred:
        best, best_iou = None, IOU_THRESHOLD
        for g in free:
            v = iou(p, gt[g])
            if v >= best_iou:
                best, best_iou = g, v
        if best is not None:
            free.remove(best)
            tp += 1
    return tp, len(pred) - tp, len(free)


def prf(tp: int, fp: int, fn: int) -> dict:
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f2 = 5 * p * r / (4 * p + r) if 4 * p + r else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "precision": p, "recall": r, "f2": f2}


def score(preds: dict[str, Pred], gts: dict[str, list[common.Box]]) -> dict:
    img = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
    box = [0, 0, 0]
    for frame, gt in gts.items():
        present, boxes = preds[frame]
        truth = bool(gt)
        img["tp" if present and truth else "fp" if present else "fn" if truth else "tn"] += 1
        for k, v in enumerate(match(boxes, gt)):
            box[k] += v
    image = prf(img["tp"], img["fp"], img["fn"])
    image["tn"] = img["tn"]
    return {"image": image, "box": prf(*box)}


# ---------------------------------------------------------------- predictions

def gemini_preds(frames: list[str], model: str, allow_missing: bool) -> tuple[dict[str, Pred], int]:
    latest: dict[str, dict] = {}
    if common.BASELINE_RAW.exists():
        for line in common.BASELINE_RAW.read_text().splitlines():
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("model") == model and rec.get("prompt_version") == PROMPT_VERSION and not rec.get("error"):
                latest[rec["frame"]] = rec
    missing = [f for f in frames if f not in latest]
    if missing and not allow_missing:
        sys.exit(f"ERROR: {len(missing)} of {len(frames)} frames have no {model} response in "
                 f"{common.BASELINE_RAW}. Rerun baseline_vlm.py (or pass --allow-missing).")
    if missing:
        print(f"WARNING: {len(missing)} frames without a Gemini response, counted as no detection")
    preds: dict[str, Pred] = {}
    unparseable = 0
    for f in frames:
        parsed = latest.get(f, {}).get("parsed")
        if f in latest and parsed is None:
            unparseable += 1
        if parsed is None:
            preds[f] = (False, [])
        else:
            boxes = parsed.get("boxes_xyxy", [])
            preds[f] = (bool(parsed.get("rip")) or bool(boxes), boxes)
    return preds, unparseable


def yolo_preds(frames: list[str], test_dir: Path, weights: str, conf: float, imgsz: int, device: str) -> dict[str, Pred]:
    from ultralytics import YOLO

    model = YOLO(weights)
    paths = [str(test_dir / "images" / f) for f in frames]
    preds: dict[str, Pred] = {}
    for r in model.predict(source=paths, conf=conf, imgsz=imgsz, device=device, stream=True, verbose=False):
        b = r.boxes
        order = b.conf.argsort(descending=True)
        boxes = [[float(c) for c in row] for row in b.xyxyn[order].tolist()]
        preds[Path(r.path).name] = (bool(boxes), boxes)
    lost = [f for f in frames if f not in preds]
    if lost:
        sys.exit(f"ERROR: YOLO returned no result for {len(lost)} frames, e.g. {lost[:3]}")
    return preds


# ---------------------------------------------------------------- outputs

def write_metrics(results: dict[str, dict], n_frames: int, notes: str) -> None:
    out = {
        "models": [
            {"name": name, "f2": round(r["box"]["f2"], 4),
             "precision": round(r["box"]["precision"], 4), "recall": round(r["box"]["recall"], 4)}
            for name, r in results.items()
        ],
        "heldOutFrames": n_frames,
        "notes": notes,
    }
    common.METRICS_JSON.parent.mkdir(parents=True, exist_ok=True)
    common.METRICS_JSON.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {common.METRICS_JSON}")


def write_markdown(results: dict[str, dict], header: list[str], baseline_name: str) -> None:
    lines = [f"# {baseline_name} vs RipWatch on held-out frames", "", *header, ""]
    for level, title in (("image", "Image level: is there a rip?"), ("box", f"Box level: IoU >= {IOU_THRESHOLD}, greedy")):
        lines += [f"## {title}", "", "| Model | TP | FP | FN | Precision | Recall | F2 |", "|---|---|---|---|---|---|---|"]
        for name, r in results.items():
            m = r[level]
            lines.append(f"| {name} | {m['tp']} | {m['fp']} | {m['fn']} | "
                         f"{m['precision']:.3f} | {m['recall']:.3f} | {m['f2']:.3f} |")
        lines.append("")
    common.COMPARISON_MD.parent.mkdir(parents=True, exist_ok=True)
    common.COMPARISON_MD.write_text("\n".join(lines))
    print(f"wrote {common.COMPARISON_MD}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--weights", required=True, help="RipWatch YOLO weights, e.g. best.pt")
    ap.add_argument("--test-dir", type=Path, default=common.DEFAULT_TEST_DIR)
    ap.add_argument("--baseline-model", default=DEFAULT_MODEL, help="Gemini model used in baseline_vlm.py")
    ap.add_argument("--conf", type=float, default=0.25, help="YOLO confidence threshold (Ultralytics default)")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--device", default="0")
    ap.add_argument("--allow-missing", action="store_true",
                    help="score frames without a Gemini response as 'no detection' instead of stopping")
    args = ap.parse_args()

    if not common.EVAL_FRAMES.exists():
        sys.exit(f"ERROR: {common.EVAL_FRAMES} not found. Run baseline_vlm.py first.")
    frames = common.read_eval_frames()
    gts = {f: common.gt_boxes(common.label_path(args.test_dir, f)) for f in frames}
    n_rip = sum(1 for g in gts.values() if g)
    rip_videos = len({common.video_of(Path(f).stem) for f, g in gts.items() if g})
    if len(frames) != 200:
        print(f"NOTE: {len(frames)} eval frames (expected 200)")

    gemini, unparseable = gemini_preds(frames, args.baseline_model, args.allow_missing)
    ripwatch = yolo_preds(frames, args.test_dir, args.weights, args.conf, args.imgsz, args.device)
    baseline_name = gemini_display_name(args.baseline_model)
    results = {baseline_name: score(gemini, gts), RIPWATCH_NAME: score(ripwatch, gts)}

    print(f"\n{'model':36s} {'level':6s} {'TP':>5s} {'FP':>5s} {'FN':>5s} {'P':>7s} {'R':>7s} {'F2':>7s}")
    for name, r in results.items():
        for level in ("image", "box"):
            m = r[level]
            print(f"{name:36s} {level:6s} {m['tp']:5d} {m['fp']:5d} {m['fn']:5d} "
                  f"{m['precision']:7.3f} {m['recall']:7.3f} {m['f2']:7.3f}")
    print(f"Gemini responses that could not be parsed (counted as no detection): {unparseable}")

    notes = (
        f"Box-level scores on {len(frames)} held-out frames from the official RipVIS val split, never used "
        f"in training: {n_rip} rip frames spread across {rip_videos} rip videos and {len(frames) - n_rip} "
        f"no-rip frames, sampled with a fixed seed. A predicted box is correct if it overlaps an unmatched "
        f"ground-truth box (the box around an annotated rip polygon) with IoU >= {IOU_THRESHOLD}, greedy "
        f"matching. F2 = 5PR/(4P+R) weights recall over precision, because missing a rip is worse than a "
        f"false alarm. Gemini: {args.baseline_model}, one fixed zero-shot prompt, unparseable answers count "
        f"as no detection. RipWatch: confidence >= {args.conf}."
    )
    write_metrics(results, len(frames), notes)
    write_markdown(results, [
        f"- Frames: {len(frames)} from the official RipVIS val split ({n_rip} rip across {rip_videos} videos, "
        f"{len(frames) - n_rip} no-rip), list in `ml/results/eval_frames.txt`",
        f"- Gemini: `{args.baseline_model}`, prompt `{PROMPT_VERSION}`, {unparseable} unparseable responses "
        "(counted as no detection)",
        f"- RipWatch: `{args.weights}`, conf >= {args.conf}, imgsz {args.imgsz}",
        f"- Box level: greedy matching at IoU >= {IOU_THRESHOLD} against boxes around the labelled polygons. "
        "F2 = 5PR/(4P+R)",
        f"- Image level also has true negatives: "
        + ", ".join(f"{n} TN = {r['image']['tn']}" for n, r in results.items()),
    ], baseline_name)


if __name__ == "__main__":
    main()
