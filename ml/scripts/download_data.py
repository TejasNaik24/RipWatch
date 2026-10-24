#!/usr/bin/env python3
"""Download a minimal subset of the RipVIS dataset from Hugging Face.

Intended for a Kaggle notebook:

    !pip install -q huggingface_hub
    !python ml/scripts/download_data.py --val-videos RipVIS-NR-004.mp4 <rip1>.mp4 <rip2>.mp4
    !python ml/scripts/download_data.py --splits val    # val only, e.g. for the Gemini baseline

Downloads ONLY (for the splits in --splits):
  - train/val sampled_images.zip
  - train/val yolo_annotations.zip
  - compute_pr_f1_f2.py
  - the requested val videos (demo clips)

Never downloads train videos or anything under test/. Paths are matched against
the real repo file list (by basename + split folder), not hardcoded.
"""
import argparse
import re
import sys
import zipfile
from pathlib import Path

from huggingface_hub import hf_hub_download, list_repo_files

REPO_ID = "Irikos/RipVIS"
REPO_TYPE = "dataset"

VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
SPLITS = ("train", "val")
SPLIT_ALIASES = {"train": "train", "val": "val", "valid": "val", "validation": "val"}

# Placeholder defaults: fill in the two rip videos via --val-videos.
DEFAULT_VAL_VIDEOS = ["RipVIS-NR-004.mp4"]


def tokens(path: str) -> list[str]:
    return [t for part in path.lower().split("/") for t in re.split(r"[^a-z0-9]+", part) if t]


def is_video(path: str) -> bool:
    return Path(path).suffix.lower() in VIDEO_EXTS


def is_test(path: str) -> bool:
    return "test" in tokens(path)


def split_of(path: str) -> str | None:
    """Split name from the directory components only (not the filename)."""
    dir_tokens = [t for part in path.lower().split("/")[:-1] for t in re.split(r"[^a-z0-9]+", part) if t]
    found = {SPLIT_ALIASES[t] for t in dir_tokens if t in SPLIT_ALIASES}
    return found.pop() if len(found) == 1 else None


def find_one(files: list[str], label: str, pred) -> str | None:
    matches = sorted(f for f in files if pred(f))
    if not matches:
        print(f"WARNING: no match in repo for {label}", file=sys.stderr)
        return None
    if len(matches) > 1:
        print(f"WARNING: {len(matches)} matches for {label}, using first: {matches}", file=sys.stderr)
    return matches[0]


def select_targets(files: list[str], val_videos: list[str], splits: tuple[str, ...] = SPLITS) -> list[str]:
    safe = [f for f in files if not is_test(f)]
    targets: list[str] = []

    for split in splits:
        for zip_name in ("sampled_images.zip", "yolo_annotations.zip"):
            hit = find_one(
                safe,
                f"{split}/{zip_name}",
                lambda f, s=split, z=zip_name: Path(f).name.lower() == z and split_of(f) == s,
            )
            if hit:
                targets.append(hit)

    hit = find_one(safe, "compute_pr_f1_f2.py", lambda f: Path(f).name.lower() == "compute_pr_f1_f2.py")
    if hit:
        targets.append(hit)

    for v in val_videos if "val" in splits else []:
        want = v.lower()
        hit = find_one(
            safe,
            f"val video {v}",
            lambda f, w=want: is_video(f)
            and split_of(f) == "val"
            and w in (Path(f).name.lower(), Path(f).stem.lower()),
        )
        if hit:
            targets.append(hit)

    # Hard guards, independent of the matching logic above.
    for t in targets:
        assert not is_test(t), f"refusing to download test path: {t}"
        assert not (is_video(t) and split_of(t) != "val"), f"refusing non-val video: {t}"
    return list(dict.fromkeys(targets))


def download(targets: list[str], out_dir: Path) -> None:
    for t in targets:
        dest = out_dir / t
        if dest.exists() and dest.stat().st_size > 0:
            print(f"[skip] {t} (already exists)")
            continue
        print(f"[download] {t}")
        hf_hub_download(repo_id=REPO_ID, repo_type=REPO_TYPE, filename=t, local_dir=out_dir)


def safe_extract(zf: zipfile.ZipFile, dest: Path) -> None:
    root = dest.resolve()
    for member in zf.infolist():
        if not (dest / member.filename).resolve().is_relative_to(root):
            raise RuntimeError(f"unsafe path in zip: {member.filename}")
    zf.extractall(dest)


def unzip_all(targets: list[str], out_dir: Path) -> dict[str, Path]:
    """Extract each zip next to itself into a folder named after the zip. Returns {repo path: dir}."""
    extracted: dict[str, Path] = {}
    for t in targets:
        if not t.lower().endswith(".zip"):
            continue
        zpath = out_dir / t
        dest = zpath.with_suffix("")
        marker = dest / ".extracted"
        extracted[t] = dest
        if marker.exists():
            print(f"[skip] unzip {t} (already extracted)")
            continue
        print(f"[unzip] {t} -> {dest}")
        dest.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zpath) as zf:
            safe_extract(zf, dest)
        marker.touch()
    return extracted


def report_counts(extracted: dict[str, Path], splits: tuple[str, ...] = SPLITS) -> None:
    print("\n=== Dataset counts ===")
    for split in splits:
        img_dirs = [d for t, d in extracted.items() if split_of(t) == split and "image" in Path(t).name.lower()]
        lbl_dirs = [d for t, d in extracted.items() if split_of(t) == split and "annotation" in Path(t).name.lower()]
        if not img_dirs or not lbl_dirs:
            print(f"{split}: missing images or annotations, cannot compare")
            continue
        images = {p.stem: p for d in img_dirs for p in d.rglob("*") if p.suffix.lower() in IMAGE_EXTS}
        labels = {p.stem: p for d in lbl_dirs for p in d.rglob("*.txt")}
        no_label = sorted(set(images) - set(labels))
        no_image = sorted(set(labels) - set(images))
        print(f"{split}: {len(images)} images, {len(labels)} label files")
        print(f"{split}: {len(no_label)} images without a label, {len(no_image)} labels without an image")
        if no_label:
            print(f"  e.g. images w/o label: {no_label[:5]}")
        if no_image:
            print(f"  e.g. labels w/o image: {no_image[:5]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out-dir", type=Path, default=Path("/kaggle/working/ripvis"))
    ap.add_argument(
        "--val-videos",
        nargs="*",
        default=DEFAULT_VAL_VIDEOS,
        help="val video filenames to fetch for demo clips (basename, with or without extension)",
    )
    ap.add_argument(
        "--splits",
        default=",".join(SPLITS),
        help='comma-separated official splits to fetch: "train,val" (default) or "val" alone',
    )
    args = ap.parse_args()
    splits = tuple(s.strip() for s in args.splits.split(",") if s.strip())
    if not splits or set(splits) - set(SPLITS):
        sys.exit(f"ERROR: --splits must be a subset of {','.join(SPLITS)} (test is never downloaded)")

    files = list_repo_files(REPO_ID, repo_type=REPO_TYPE)
    print(f"Repo {REPO_ID}: {len(files)} files total. Non-video paths:")
    for f in sorted(files):
        if not is_video(f):
            print(f"  {f}")
    print()

    targets = select_targets(files, args.val_videos, splits)
    print("Selected for download:")
    for t in targets:
        print(f"  {t}")
    print()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    download(targets, args.out_dir)
    extracted = unzip_all(targets, args.out_dir)
    report_counts(extracted, splits)


if __name__ == "__main__":
    main()
