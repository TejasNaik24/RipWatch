#!/usr/bin/env python3
"""Shortlist demo clips from the RipVIS VALIDATION split (never train: the model trained on it).

    python ml/scripts/find_clips.py              # laptop; downloads ~14 MB of metadata + the shortlisted videos

1. Downloads val/coco_annotations/val.json and RipVISv1.8.4_dataset_info.pdf into ml/data/ripvis/.
2. For every val rip video (minus EXCLUDED, whose frame numbers do not match the video) computes from
   the annotations: rip coverage (fraction of sampled frames with a rip), mean rip area as a fraction of
   the frame, area stability (coefficient of variation across rip frames), and rip instances per frame.
   Video fps, duration, resolution and source come from the dataset info PDF (it has no viewpoint field;
   viewpoint is judged by eye from the contact sheets).
3. Ranks candidates for clip1_obvious (steady, large, clear rip) and clip2_sneaky (rip in most frames
   but small to medium area) and suggests a 10-20 s window for each.
4. Downloads the top --top videos per role from val/videos/ into ml/data/videos/ and writes a contact
   sheet per candidate to docs/clip-candidates/: 6 evenly spaced annotated frames, plain on the top row
   and with the ground-truth rip polygons outlined in red on the bottom row.

Full score tables go to ml/data/clip_scores.md and .json (git-ignored). No video or dataset file is
written outside ml/data/.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # find common.py even under python -I
import common  # noqa: E402
from download_data import REPO_ID, REPO_TYPE  # noqa: E402

DATA = common.REPO / "ml" / "data"
HF_DIR = DATA / "ripvis"
VIDEO_DIR = DATA / "videos"
SHEET_DIR = common.REPO / "docs" / "clip-candidates"
ANNOTATIONS = "val/coco_annotations/val.json"
INFO_PDF = "RipVISv1.8.4_dataset_info.pdf"

# Val videos whose frame numbers do not match the video (per the ML teammate). Never shortlisted.
EXCLUDED = {"RipVIS-001", "RipVIS-007", "RipVIS-012", "RipVIS-014", "RipVIS-024", "RipVIS-039"}

FRAME_RE = re.compile(r"^(RipVIS-(?:NR-)?\d+)_(\d+)\.\w+$")
MIN_DURATION = 10.0    # s; a demo window must be at least 10 s
MIN_SAMPLES = 10       # fewer annotated frames than this makes the stats unreliable
WINDOW_MAX = 20.0
WINDOW_TARGET = 15.0
LARGE_AREA = 0.15      # clip1: a rip covering 15% of the frame counts as fully "large"
SNEAKY_BAND = (0.015, 0.08)  # clip2: small to medium rip, as a fraction of the frame


# ---------------------------------------------------------------- download

def fetch(filename: str) -> Path:
    from huggingface_hub import hf_hub_download

    return Path(hf_hub_download(repo_id=REPO_ID, repo_type=REPO_TYPE, filename=filename, local_dir=HF_DIR))


def fetch_video(video: str) -> Path:
    """val/videos/{video}.mp4 -> ml/data/videos/{video}.mp4. Refuses anything outside val/."""
    dest = VIDEO_DIR / f"{video}.mp4"
    if dest.exists():
        return dest
    src = f"val/videos/{video}.mp4"
    assert src.startswith("val/"), src
    print(f"  downloading {src}")
    path = fetch(src)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), dest)
    return dest


# ---------------------------------------------------------------- dataset info PDF

INFO_ROW = re.compile(
    r"(RipVIS-(?:NR-)?\d+)\s+([\d.]+)\s+(\d+):(\d+(?:\.\d+)?)\s+(\d+)\s+([\d.]+)\s*x\s*([\d.]+)\s+(\d+)\s+"
    r"(.*?)\s+(\d+)\s+(de Silva et al\.|Internet|Unibuc|\S+)(?=\s|$)",
    re.DOTALL,
)


def parse_info(pdf: Path) -> dict[str, dict]:
    """Per video: fps, duration, sampling rate, resolution, number of rips, source. Empty if unparseable."""
    try:
        from pypdf import PdfReader
    except ImportError:
        print("WARNING: pypdf not installed (pip install pypdf); skipping the dataset info PDF")
        return {}
    text = "\n".join(page.extract_text() or "" for page in PdfReader(str(pdf)).pages)
    num = lambda s: int(s.replace(".", ""))  # the PDF writes 1920 as "1.920"
    info = {}
    for m in INFO_ROW.finditer(text):
        vid, fps, mm, ss, samp, w, h, rips, _annot, total, source = m.groups()
        info[vid] = {"fps": float(fps), "duration": int(mm) * 60 + float(ss), "sampling_fps": int(samp),
                     "resolution": [num(w), num(h)], "n_rips": int(rips), "sampled_total": int(total),
                     "source": source}
    print(f"dataset info PDF: parsed {len(info)} video rows")
    return info


# ---------------------------------------------------------------- stats

def video_stats(coco: dict, info: dict[str, dict]) -> dict[str, dict]:
    anns = defaultdict(list)
    for a in coco["annotations"]:
        anns[a["image_id"]].append(a)
    frames = defaultdict(list)
    for im in coco["images"]:
        m = FRAME_RE.match(im["file_name"])
        if m and "-NR-" not in m.group(1):
            frames[m.group(1)].append((int(m.group(2)), im))

    stats = {}
    for vid, items in sorted(frames.items()):
        if vid in EXCLUDED:
            continue
        items.sort(key=lambda x: x[0])
        meta = info.get(vid, {})
        w, h = items[0][1]["width"], items[0][1]["height"]
        fps = meta.get("fps") or 30.0
        per_frame = []
        for fnum, im in items:
            a = anns.get(im["id"], [])
            area = min(sum(x["area"] for x in a) / (im["width"] * im["height"]), 1.0)
            per_frame.append({"frame": fnum, "t": fnum / fps, "n": len(a), "area": area, "image": im})
        rip = [f for f in per_frame if f["n"]]
        areas = [f["area"] for f in rip]
        mean_area = sum(areas) / len(areas) if areas else 0.0
        sd = math.sqrt(sum((x - mean_area) ** 2 for x in areas) / len(areas)) if areas else 0.0
        stats[vid] = {
            "video": vid,
            "sampled": len(per_frame),
            "coverage": len(rip) / len(per_frame),
            "mean_area": mean_area,
            "area_cv": sd / mean_area if mean_area else float("inf"),
            "instances": sum(f["n"] for f in rip) / len(rip) if rip else 0.0,
            "annotated_span": (items[-1][0] - items[0][0]) / fps,
            "duration": meta.get("duration"),
            "fps": fps,
            "resolution": meta.get("resolution") or [w, h],
            "source": meta.get("source", "?"),
            "frames": per_frame,
        }
    return stats


def band_score(a: float) -> float:
    lo, hi = SNEAKY_BAND
    if a < lo:
        return a / lo
    if a <= hi:
        return 1.0
    return max(0.0, 1.0 - (a - hi) / 0.12)


def frame_score(role: str, f: dict) -> float:
    if not f["n"]:
        return 0.0
    return min(f["area"] / LARGE_AREA, 1.0) if role == "clip1_obvious" else band_score(f["area"])


def role_score(role: str, s: dict) -> float:
    stability = max(0.0, 1.0 - s["area_cv"])
    single = 1.0 / max(s["instances"], 1.0)
    if role == "clip1_obvious":
        score = 0.35 * s["coverage"] + 0.35 * min(s["mean_area"] / LARGE_AREA, 1.0) + 0.2 * stability + 0.1 * single
    else:
        score = 0.4 * s["coverage"] + 0.35 * band_score(s["mean_area"]) + 0.15 * stability + 0.1 * single
    if min(s["resolution"]) < 720:
        score *= 0.6  # visibly soft on a 1080p recording
    return score


def eligible(s: dict) -> tuple[bool, str]:
    if s["duration"] is not None and s["duration"] < MIN_DURATION:
        return False, f"video only {s['duration']:.1f}s"
    if s["sampled"] < MIN_SAMPLES:
        return False, f"only {s['sampled']} annotated frames"
    return True, ""


def best_window(role: str, s: dict) -> tuple[float, float, float]:
    """(start, end, mean frame score) of the best window of up to 15 s (at least 10 s when the video allows),
    scored on the annotated frames inside it. Windows start on whole seconds."""
    span_end = s["frames"][-1]["t"]
    total = s["duration"] or span_end
    length = min(WINDOW_TARGET, max(MIN_DURATION, span_end), total, WINDOW_MAX)
    best = (0.0, length, -1.0)
    start = 0.0
    while start + length <= max(span_end, length) + 1e-6:
        inside = [frame_score(role, f) for f in s["frames"] if start <= f["t"] <= start + length]
        if inside:
            sc = sum(inside) / len(inside)
            if sc > best[2] + 1e-9:
                best = (start, start + length, sc)
        start += 1.0
    return best


# ---------------------------------------------------------------- contact sheets

def contact_sheet(s: dict, video: Path, out: Path, title: str, tile_w: int = 320) -> None:
    import cv2
    import numpy as np

    picks = [s["frames"][round(k * (len(s["frames"]) - 1) / 5)] for k in range(6)]
    cap = cv2.VideoCapture(str(video))
    tiles_plain, tiles_gt = [], []
    for f in picks:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f["frame"])
        ok, img = cap.read()
        if not ok:
            sys.exit(f"ERROR: could not read frame {f['frame']} of {video}")
        im = f["image"]
        sx, sy = img.shape[1] / im["width"], img.shape[0] / im["height"]
        tile_h = round(tile_w * img.shape[0] / img.shape[1])
        plain = cv2.resize(img, (tile_w, tile_h), interpolation=cv2.INTER_AREA)
        gt = plain.copy()
        k = tile_w / img.shape[1]
        for a in s["annotations"].get(im["id"], []):
            for seg in a["segmentation"]:
                pts = np.array(seg, np.float32).reshape(-1, 2) * [sx * k, sy * k]
                cv2.polylines(gt, [np.round(pts).astype(np.int32)], True, (40, 40, 255), 2, cv2.LINE_AA)
        for t in (plain, gt):
            label = f"{f['t']:.1f}s"
            cv2.rectangle(t, (0, tile_h - 20), (8 + 9 * len(label), tile_h), (0, 0, 0), cv2.FILLED)
            cv2.putText(t, label, (4, tile_h - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        tiles_plain.append(plain)
        tiles_gt.append(gt)
    cap.release()
    gap = 4
    def row(tiles):
        h = max(t.shape[0] for t in tiles)
        padded = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, gap, cv2.BORDER_CONSTANT, value=(20, 20, 20))
                  for t in tiles]
        return np.hstack(padded)
    grid = np.vstack([row(tiles_plain), np.full((gap, row(tiles_plain).shape[1], 3), 20, np.uint8), row(tiles_gt)])
    header = np.full((34, grid.shape[1], 3), 20, np.uint8)
    cv2.putText(header, title, (8, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (235, 235, 235), 1, cv2.LINE_AA)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), np.vstack([header, grid]), [cv2.IMWRITE_JPEG_QUALITY, 82])


# ---------------------------------------------------------------- main

def fmt_row(rank, s, score, window, note=""):
    res = "x".join(map(str, s["resolution"]))
    dur = f"{s['duration']:.1f}" if s["duration"] is not None else "?"
    win = f"{window[0]:.0f}-{window[1]:.0f}s" if window else ""
    return (f"| {rank} | {s['video']} | {score:.3f} | {s['coverage']:.2f} | {s['mean_area']:.3f} | {s['area_cv']:.2f} "
            f"| {s['instances']:.2f} | {s['sampled']} | {s['annotated_span']:.1f} | {dur} | {res} | {s['source']} | {win} | {note} |")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--top", type=int, default=4, help="candidates per role to download and make sheets for")
    ap.add_argument("--no-videos", action="store_true", help="rank only; skip video downloads and sheets")
    args = ap.parse_args()

    coco = json.loads(fetch(ANNOTATIONS).read_text())
    info = parse_info(fetch(INFO_PDF))
    stats = video_stats(coco, info)
    anns = defaultdict(list)
    for a in coco["annotations"]:
        anns[a["image_id"]].append(a)
    print(f"{len(stats)} val rip videos after excluding {len(EXCLUDED)}")

    roles = ("clip1_obvious", "clip2_sneaky")
    ranks = {role: [s["video"] for s in sorted(stats.values(), key=lambda s: -role_score(role, s)) if eligible(s)[0]]
             for role in roles}

    def home(video: str) -> str:
        """A video that would be shortlisted for both roles stays in the one where it ranks higher."""
        return min(roles, key=lambda r: ranks[r].index(video))

    md = ["Columns: score, coverage (rip frames / sampled), mean rip area (fraction of frame), area CV "
          "(lower = steadier), rip instances per rip frame, annotated frames, annotated span (s), video duration (s), "
          "resolution, source, suggested window.\n"]
    shortlist: dict[str, list[dict]] = {}
    out_json = {}
    for role in roles:
        other = next(r for r in roles if r != role)
        ranked = sorted(stats.values(), key=lambda s: -role_score(role, s))
        md += [f"## {role}\n", "| # | video | score | cov | area | CV | inst | n | span | dur | res | source | window | note |",
               "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
        picks, rank = [], 0
        for s in ranked:
            ok, why = eligible(s)
            window = best_window(role, s) if ok else None
            if ok:
                rank += 1
                shared = s["video"] in ranks[other][:args.top] and home(s["video"]) == other
                if shared:
                    why = f"shortlisted for {other} instead"
                elif len(picks) < args.top:
                    picks.append({"rank": rank, "stats": s, "score": role_score(role, s), "window": window})
            md.append(fmt_row(rank if ok else "-", s, role_score(role, s), window, why))
        md.append("")
        shortlist[role] = picks
        out_json[role] = [{"rank": p["rank"], "video": p["stats"]["video"], "score": round(p["score"], 4),
                           "window": [p["window"][0], p["window"][1]],
                           **{k: v for k, v in p["stats"].items() if k != "frames"}} for p in picks]
        print(f"\n{role} top {args.top}:")
        for p in picks:
            s = p["stats"]
            print(f"  {p['rank']}. {s['video']}  score {p['score']:.3f}  cov {s['coverage']:.2f}  "
                  f"area {s['mean_area']:.3f}  cv {s['area_cv']:.2f}  inst {s['instances']:.2f}  "
                  f"window {p['window'][0]:.0f}-{p['window'][1]:.0f}s  {s['source']}")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "clip_scores.md").write_text("\n".join(md) + "\n")
    (DATA / "clip_scores.json").write_text(json.dumps(out_json, indent=2) + "\n")
    print(f"\nscore tables: {DATA / 'clip_scores.md'}")
    if args.no_videos:
        return

    print("\nvideos and contact sheets:")
    for role, picks in shortlist.items():
        for p in picks:
            s = p["stats"]
            s["annotations"] = anns
            video = fetch_video(s["video"])
            out = SHEET_DIR / f"{role}_{p['rank']}_{s['video']}.jpg"
            title = (f"{role} #{p['rank']}  {s['video']}  score {p['score']:.2f}  coverage {s['coverage']:.2f}  "
                     f"area {s['mean_area']:.3f}  CV {s['area_cv']:.2f}  inst {s['instances']:.1f}  "
                     f"top: plain / bottom: ground truth")
            contact_sheet(s, video, out, title)
            print(f"  {out.relative_to(common.REPO)}")


if __name__ == "__main__":
    main()
