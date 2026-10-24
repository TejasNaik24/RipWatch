#!/usr/bin/env python3
"""Turn the downloaded RipVIS data into an Ultralytics YOLO segmentation dataset.

Input is the tree written by download_data.py (default /kaggle/working/ripvis):

    <root>/{train,val}/sampled_images/   images + an "additional data" folder (train only)
    <root>/{train,val}/yolo_annotations/ label .txt files

Output (symlinks only, nothing is copied):

    <out>/{train,dev,test}/{images,labels}
    <out>/data.yaml

Splits:
    test  = the official val split. Held out, never trained on.
    dev   = a few whole videos carved out of the official train split (fixed seed).
            Used as the YOLO "val" set during training.
    train = the rest of the official train split, plus the additional data.

Splitting is by video ID, so frames from one video never land in two splits.
Frames of no-rip videos (RipVIS-NR-*) have no label file by design. They are kept as
background negatives. Any other frame without annotations is excluded.
"""
from __future__ import annotations

import argparse
import random
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
NON_LABEL_STEMS = {"classes", "labels", "readme", "notes"}
FRAME_RE = re.compile(r"^RipVIS-(NR-)?(\d+)_(\d+)$", re.IGNORECASE)
ADDITIONAL_PREFIX = "add_"  # keeps additional-data names from colliding with RipVIS frames
EXAMPLES = 5
MAX_LISTED = 100


@dataclass
class Label:
    path: Path
    group: str  # "main" or "additional"
    annotations: int = 0  # non-blank lines


@dataclass
class Image:
    path: Path
    group: str  # "main" or "additional"
    kind: str  # "NR" (no-rip video), "RIP" (rip video), "OTHER" (name not recognised)
    video: tuple[str, str] | None  # (kind, zero-padded id), None for OTHER
    label: Label | None = None

    @property
    def stem(self) -> str:
        return self.path.stem

    @property
    def annotated(self) -> bool:
        return self.label is not None and self.label.annotations > 0


@dataclass
class FormatStats:
    files: int = 0
    empty_files: int = 0
    lines: int = 0
    ok_lines: int = 0
    problems: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    counts: Counter = field(default_factory=Counter)

    def flag(self, kind: str, where: str) -> None:
        self.counts[kind] += 1
        if len(self.problems[kind]) < EXAMPLES:
            self.problems[kind].append(where)


def heading(text: str) -> None:
    print(f"\n{'=' * 78}\n{text}\n{'=' * 78}")


def find_dir(root: Path, split: str, keyword: str) -> Path:
    hits = sorted(p for p in (root / split).glob(f"*{keyword}*") if p.is_dir())
    if not hits:
        sys.exit(f"ERROR: no '*{keyword}*' folder under {root / split}. Did download_data.py run?")
    if len(hits) > 1:
        print(f"WARNING: several '*{keyword}*' folders under {root / split}, using {hits[0].name}: {hits}")
    return hits[0]


def is_additional(path: Path, base: Path) -> bool:
    """True if any folder between base and the file mentions 'addit' (the dataset spells it 'addittional')."""
    return any("addit" in part.lower() for part in path.relative_to(base).parts[:-1])


def classify(stem: str) -> tuple[str, tuple[str, str] | None]:
    m = FRAME_RE.match(stem)
    if not m:
        return "OTHER", None
    kind = "NR" if m.group(1) else "RIP"
    return kind, (kind, m.group(2).zfill(3))


def scan_images(base: Path) -> list[Image]:
    out = []
    for p in sorted(base.rglob("*")):
        if p.suffix.lower() in IMAGE_EXTS and p.is_file():
            group = "additional" if is_additional(p, base) else "main"
            kind, video = classify(p.stem)
            # Additional-data images are never grouped into videos, even if a name looks like one.
            if group == "additional":
                kind, video = "OTHER", None
            out.append(Image(p, group, kind, video))
    return out


def check_line(line: str, where: str, stats: FormatStats) -> bool:
    tokens = line.split()
    try:
        cls = int(tokens[0])
    except ValueError:
        stats.flag("non-integer class", where)
        return False
    if cls != 0:
        stats.flag(f"other class ({cls})", where)
        return False
    try:
        coords = [float(t) for t in tokens[1:]]
    except ValueError:
        stats.flag("non-numeric coordinate", where)
        return False
    n = len(coords)
    if n == 4:
        stats.flag("box-only line (4 coordinates)", where)
        return False
    if n < 4:
        stats.flag(f"too few coordinates ({n})", where)
        return False
    if n % 2:
        stats.flag("odd number of coordinates", where)
        return False
    if any(c < -1e-6 or c > 1 + 1e-6 for c in coords):
        stats.flag("coordinate outside [0, 1]", where)
        return False
    return True


def scan_labels(base: Path, stats: FormatStats) -> list[Label]:
    out = []
    for p in sorted(base.rglob("*.txt")):
        if p.stem.lower() in NON_LABEL_STEMS:
            continue
        lab = Label(p, "additional" if is_additional(p, base) else "main")
        stats.files += 1
        for n, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
            if not line.strip():
                continue
            lab.annotations += 1
            stats.lines += 1
            if check_line(line, f"{p.name}:{n}", stats):
                stats.ok_lines += 1
        if lab.annotations == 0:
            stats.empty_files += 1
        out.append(lab)
    return out


def attach_labels(images: list[Image], labels: list[Label]) -> tuple[int, int]:
    """Match labels to images by file stem. Returns (orphan labels, ambiguous matches)."""
    by_stem: dict[str, list[Label]] = defaultdict(list)
    for lab in labels:
        by_stem[lab.path.stem].append(lab)
    used: set[Path] = set()
    ambiguous = 0
    for im in images:
        cands = by_stem.get(im.stem, [])
        if len(cands) > 1:
            cands = [c for c in cands if c.group == im.group]
        if len(cands) == 1:
            im.label = cands[0]
            used.add(cands[0].path)
        elif len(cands) > 1:
            ambiguous += 1
    return len(labels) - len(used), ambiguous


def report_format(split: str, stats: FormatStats) -> None:
    print(f"[{split}] label files: {stats.files} ({stats.empty_files} empty), annotation lines: {stats.lines}")
    print(f"[{split}] lines that are 'class 0 + polygon (>4 coordinates)': {stats.ok_lines} / {stats.lines}")
    if not stats.counts:
        print(f"[{split}] PASS: no box-only, other-class or malformed lines")
        return
    print(f"[{split}] FAIL: {sum(stats.counts.values())} problem lines")
    for kind, n in stats.counts.most_common():
        print(f"    {n:6d}  {kind}   e.g. {', '.join(stats.problems[kind])}")


def report_unlabeled(split: str, images: list[Image], out_dir: Path) -> None:
    print(f"\n[{split}] images: {len(images)}")
    rows = Counter()
    for im in images:
        rows[(im.group, im.kind, "labeled" if im.annotated else "unlabeled")] += 1
    for group in ("main", "additional"):
        for kind in ("RIP", "NR", "OTHER"):
            tot = rows[(group, kind, "labeled")] + rows[(group, kind, "unlabeled")]
            if tot:
                name = {"RIP": "RipVIS-0xx (rip videos)", "NR": "RipVIS-NR-* (no-rip videos)", "OTHER": "other names"}[kind]
                print(f"    {group:10s} {name:28s} total {tot:6d}   labeled {rows[(group, kind, 'labeled')]:6d}   "
                      f"unlabeled {rows[(group, kind, 'unlabeled')]:6d}")

    bad = [im for im in images if im.kind == "RIP" and not im.annotated]
    if not bad:
        print(f"[{split}] every RipVIS-0xx image has a label")
        return
    names = [im.path.name for im in bad]
    (out_dir / f"unlabeled_rip_images_{split}.txt").write_text("\n".join(names) + "\n")
    print(f"[{split}] {len(bad)} RipVIS-0xx (rip video) images WITHOUT annotations "
          f"(full list: {out_dir / f'unlabeled_rip_images_{split}.txt'}):")
    for n in names[:MAX_LISTED]:
        print(f"    {n}")
    if len(names) > MAX_LISTED:
        print(f"    ... and {len(names) - MAX_LISTED} more")


def report_additional(train: list[Image]) -> None:
    add = [im for im in train if im.group == "additional"]
    if not add:
        print("\nadditional data: NOT FOUND in train/sampled_images (no folder containing 'addit')")
        return
    n = sum(im.annotated for im in add)
    print(f"\nadditional data: FOUND, {len(add)} images, {n} with labels, {len(add) - n} without")


def keep(im: Image) -> bool:
    if im.annotated:
        return True
    return im.kind == "NR"  # no-rip frames are background negatives


def choose_dev(train_main: list[Image], n_rip: int, n_nr: int, seed: int) -> set[tuple[str, str]]:
    rip = sorted({im.video for im in train_main if im.kind == "RIP" and im.annotated})
    nr = sorted({im.video for im in train_main if im.kind == "NR"})
    rng = random.Random(seed)
    for label, pool, n in (("rip", rip, n_rip), ("no-rip", nr, n_nr)):
        if len(pool) < n:
            print(f"WARNING: only {len(pool)} {label} videos available in train, wanted {n}")
    return set(rng.sample(rip, min(n_rip, len(rip))) + rng.sample(nr, min(n_nr, len(nr))))


def clean_split_dir(d: Path) -> None:
    """Remove a previous run's output. Only symlinks and empty files are deleted; anything else aborts."""
    if not d.exists():
        return
    for p in sorted(d.rglob("*"), reverse=True):
        if p.is_symlink() or (p.is_file() and p.stat().st_size == 0):
            p.unlink()
        elif p.is_dir():
            p.rmdir()
        else:
            sys.exit(f"ERROR: {p} is a real file, refusing to clean {d}. Remove it or pick another --out.")
    d.rmdir()


def link_split(out: Path, split: str, items: list[Image]) -> dict:
    """Symlink images and labels into <out>/<split>. Returns counts."""
    img_dir, lab_dir = out / split / "images", out / split / "labels"
    clean_split_dir(out / split)
    img_dir.mkdir(parents=True)
    lab_dir.mkdir(parents=True)
    seen: dict[str, Path] = {}
    c = Counter()
    for im in items:
        name = (ADDITIONAL_PREFIX if im.group == "additional" else "") + im.path.name
        if name in seen:
            sys.exit(f"ERROR: duplicate image name {name} in {split}: {seen[name]} and {im.path}")
        seen[name] = im.path
        (img_dir / name).symlink_to(im.path.resolve())
        stem = Path(name).stem
        if im.annotated:
            (lab_dir / f"{stem}.txt").symlink_to(im.label.path.resolve())
            c["labeled"] += 1
            c["instances"] += im.label.annotations
        else:
            (lab_dir / f"{stem}.txt").touch()  # empty label file = background image
            c["negative"] += 1
    c["images"] = len(items)
    return c


def write_yaml(out: Path) -> Path:
    path = out / "data.yaml"
    path.write_text(
        f"path: {out.resolve()}\n"
        "train: train/images\n"
        "val: dev/images  # dev split, used during training\n"
        "test: test/images  # official val split, held out\n"
        "names:\n"
        "  0: rip_current\n"
    )
    return path


def videos_of(items: list[Image]) -> set[tuple[str, str]]:
    return {im.video for im in items if im.video}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=Path("/kaggle/working/ripvis"))
    ap.add_argument("--out", type=Path, default=Path("/kaggle/working/yolo"))
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--dev-rip-videos", type=int, default=8)
    ap.add_argument("--dev-nr-videos", type=int, default=2)
    ap.add_argument("--dry-run", action="store_true", help="run the sanity checks only, build nothing")
    ap.add_argument("--strict", action="store_true", help="exit non-zero if any label line is not class 0 + polygon")
    ap.add_argument("--splits", default="train,val",
                    help='official splits that were downloaded: "train,val" (default) or "val" alone, '
                         "which builds only test/ (enough for baseline_vlm.py and eval_compare.py)")
    args = ap.parse_args()
    official = tuple(s.strip() for s in args.splits.split(",") if s.strip())
    if not official or set(official) - {"train", "val"}:
        sys.exit("ERROR: --splits must be a subset of train,val")

    args.out.mkdir(parents=True, exist_ok=True)
    scanned: dict[str, list[Image]] = {}
    fmt: dict[str, FormatStats] = {}

    heading("1. Sanity checks")
    for split in official:
        img_base = find_dir(args.root, split, "sampled_images")
        lab_base = find_dir(args.root, split, "yolo_annotations")
        images = scan_images(img_base)
        fmt[split] = FormatStats()
        labels = scan_labels(lab_base, fmt[split])
        orphans, ambiguous = attach_labels(images, labels)
        scanned[split] = images
        report_unlabeled(split, images, args.out)
        print(f"[{split}] label files with no matching image: {orphans}; ambiguous label matches: {ambiguous}")

    if "train" in scanned:
        report_additional(scanned["train"])

    heading("Label format (expect: class 0, then polygon with more than 4 coordinates)")
    for split in official:
        report_format(split, fmt[split])
    format_ok = not any(s.counts for s in fmt.values())

    if args.dry_run:
        print("\n--dry-run: nothing built.")
        sys.exit(0 if format_ok or not args.strict else 1)
    if args.strict and not format_ok:
        sys.exit("ERROR: --strict and some label lines are not class 0 + polygon. Nothing built.")

    heading("2. Building splits (symlinks)")
    excluded = Counter()
    for split, imgs in scanned.items():
        for im in imgs:
            if not keep(im):
                excluded[(split, im.kind, im.group)] += 1
    for (split, kind, group), n in sorted(excluded.items()):
        print(f"excluded (no annotations): {n:6d}  official {split}, {group}, {kind}")
    print(f"excluded total: {sum(excluded.values())}")

    splits: dict[str, list[Image]] = {}
    if "val" in scanned:
        splits["test"] = [im for im in scanned["val"] if keep(im)]
    if "train" in scanned:
        kept_train = [im for im in scanned["train"] if keep(im)]
        train_main = [im for im in kept_train if im.group == "main"]
        dev_videos = choose_dev(train_main, args.dev_rip_videos, args.dev_nr_videos, args.seed)
        print(f"dev videos (seed {args.seed}): "
              f"{sorted(f'RipVIS-{v[1]}' if v[0] == 'RIP' else f'RipVIS-NR-{v[1]}' for v in dev_videos)}")
        splits["dev"] = [im for im in train_main if im.video in dev_videos]
        splits["train"] = [im for im in kept_train if im.group == "additional" or im.video not in dev_videos]

    counts = {name: link_split(args.out, name, items) for name, items in splits.items()}
    order = [n for n in ("train", "dev", "test") if n in splits]

    heading("3. Leakage check (by video ID)")
    vids = {name: videos_of(items) for name, items in splits.items()}
    leaks = {
        f"{a}/{b}": sorted(vids[a] & vids[b])
        for a, b in (("train", "dev"), ("train", "test"), ("dev", "test"))
        if a in vids and b in vids and vids[a] & vids[b]
    }
    for name in order:
        n_rip = sum(1 for v in vids[name] if v[0] == "RIP")
        print(f"{name:5s}: {len(vids[name]):3d} videos ({n_rip} rip, {len(vids[name]) - n_rip} no-rip)")
    if len(order) > 1:
        print("FAIL: videos in more than one split: " + str(leaks) if leaks else "PASS: no video appears in more than one split")
    else:
        print("only one split built, nothing to compare")

    heading("4. Final counts")
    print(f"{'split':6s} {'images':>8s} {'labeled':>9s} {'unlabeled (NR negatives)':>26s} {'instances':>10s}")
    for name in order:
        c = counts[name]
        print(f"{name:6s} {c['images']:8d} {c['labeled']:9d} {c['negative']:26d} {c['instances']:10d}")
    if "train" in splits:
        add = [im for im in splits["train"] if im.group == "additional"]
        print(f"(train includes {len(add)} additional-data images)")
    if {"train", "test"} <= set(splits):
        yaml_path = write_yaml(args.out)
        print(f"\ndata.yaml: {yaml_path}\n{yaml_path.read_text()}")
    else:
        print("\ndata.yaml not written: training needs both official splits (--splits train,val).")
    if not format_ok:
        print("WARNING: some label lines are not class 0 + polygon (see the label format section above). "
              "They were linked as-is; rerun with --strict to stop instead.")
    if leaks:
        sys.exit(1)


if __name__ == "__main__":
    main()
