# ML log

Owned by the ML person. Append only; newest entry last. Format per entry: date/time, what was built, files touched, what's next, blockers.

## 2026-10-24
**Built:** `ml/scripts/download_data.py`, a Kaggle-notebook script that pulls a minimal subset of RipVIS from Hugging Face (`Irikos/RipVIS`, dataset) with `huggingface_hub`.
- Prints every non-video path from `list_repo_files` first, so the real layout is visible.
- Downloads only train/val `sampled_images.zip` and `yolo_annotations.zip`, `compute_pr_f1_f2.py`, and the val videos in `--val-videos`.
- Paths are matched from the file list (basename plus split folder token), not hardcoded. Any path with a `test` token is never downloaded, and videos come from val only.
- `--out-dir` defaults to `/kaggle/working/ripvis`. Existing downloads and already-extracted zips are skipped.
- Unzips each archive next to itself, then prints image and label counts per split, plus images without labels and labels without images (matched by file stem).

**Files touched:** `ml/scripts/download_data.py`, `notes/ml.md`

**Next:**
- Run it in Kaggle and check the printed layout against the matching logic.
- Pick the two rip demo videos and pass them via `--val-videos` (default is only `RipVIS-NR-004.mp4`).

**Blockers:** None. The script has not been run against the real repo; I only checked target selection against a mock file list.

## 2026-10-24 (prepare_yolo.py)
**Built:** `ml/scripts/prepare_yolo.py`, which turns the `download_data.py` output (default `/kaggle/working/ripvis`) into an Ultralytics YOLO-seg dataset at `/kaggle/working/yolo`. Written from the dataset README's layout and naming. Not run on the real data. I only ran it on a tiny synthetic tree with planted defects (unlabeled rip frame, box-only line, class-1 line, additional data), and it caught each.
- Sanity checks, printed per split: unlabeled images by group and prefix (RipVIS-0xx rip vs RipVIS-NR-*), the full list of unlabeled RipVIS-0xx images (also written to `unlabeled_rip_images_<split>.txt`), whether additional data exists and how many of it are labeled, and a label-format check (class 0 plus a polygon of more than 4 coordinates; reports box-only, other-class, malformed and out-of-[0,1] lines with file:line examples). Also reports orphan labels and ambiguous matches.
- Splits (symlinks only): test = official val, held out. dev = 8 rip + 2 no-rip whole videos from official train (seed 42, flags `--dev-rip-videos`, `--dev-nr-videos`, `--seed`). train = the rest of official train plus additional data. Splitting is by video ID, and a leakage check prints PASS or FAIL per split pair.
- Writes `data.yaml` (`train`, `val: dev/images`, `test`, `0: rip_current`) and prints final counts per split (images, labeled, unlabeled negatives, instances).
- Flags: `--dry-run` (checks only), `--strict` (stop if any label line is bad).

**Decisions to check**
- No-rip frames (RipVIS-NR-*) have no labels by design, so they are KEPT as background negatives and get an empty label file. Every other image without annotations is excluded and counted. An empty label file on a rip frame also counts as unlabeled and is excluded.
- Additional data is found by a folder name containing "addit" (the README spells it `addittional_data`). Its images are renamed with an `add_` prefix to avoid name clashes, are never part of the dev carve-out, and always go to train. If its labels are not in `yolo_annotations`, they will show as unlabeled and be excluded. Check the printed counts.
- Bad label lines are reported but linked as-is (symlinks cannot be edited). If the check fails on train labels, fix or filter them before training.

**Files touched:** `ml/scripts/prepare_yolo.py`, `notes/ml.md`

**Next:** run `download_data.py` then `prepare_yolo.py --dry-run` in Kaggle and read the sanity-check output. Then build for real and train on `/kaggle/working/yolo/data.yaml`.

**Blockers:** None. Unknown until run: whether the real label folders match (stem-based matching), and how many rip frames lack labels.

## 2026-10-24 (train.py)
**Built:** `ml/scripts/train.py`, which fine-tunes YOLO11-seg on `/kaggle/working/yolo/data.yaml`. Run it as `!python ml/scripts/train.py` (not in the kernel) so 2xT4 DDP works. Not run, and Ultralytics is not installed on this laptop, so the Ultralytics calls are untested.
- Args and defaults as specified: `--model yolo11s-seg.pt --epochs 40 --imgsz 640 --batch 16 --device 0,1 --patience 10 --name ripwatch_s --project /kaggle/working/runs --workers 4`. Also `--data` (default `/kaggle/working/yolo/data.yaml`).
- `--smoke`: 2 epochs, `fraction=0.1`, name gets `_smoke`. It still runs the test evaluation, so the whole pipeline is exercised.
- COCO-pretrained start, default augmentations (none overridden), `plots=True`, `save_period=1` (an `epochN.pt` every epoch, plus `last.pt` and `best.pt`).
- Per-epoch time: Ultralytics callbacks do not reach DDP worker processes, so a background thread tails `results.csv` and prints `[epoch time] epoch N/M: Xs this epoch, Y min elapsed, ~Z min left`. The ETA assumes all epochs run (early stopping can end sooner).
- After training it evaluates `weights/best.pt` with `split="test"` on the first GPU (validation outside training is single-GPU) and prints box and mask mAP50, mAP50-95, P and R. It saves them to `<project>/<name>/test_metrics.json`; plots go to `<project>/<name>/test/`.
- If `<project>/<name>` exists, it uses `<name>2`, `<name>3`... so a rerun never mixes with an old run (the message says which). Output path in that case is the suffixed one.
- Also: exits early if the requested GPUs are not visible, and disables W&B so Kaggle never waits on a login prompt.
- Checked on this laptop (no GPU, no Ultralytics): CLI parsing, the missing-data error, run naming, and the epoch timer against a fake `results.csv` (including a half-written last row).

**Files touched:** `ml/scripts/train.py`, `notes/ml.md`

**Next:** in Kaggle run `train.py --smoke` first (check DDP starts on both GPUs, epoch times print, `test_metrics.json` appears), then the full run. If DDP hangs, rerun with `--device 0`.

**Blockers:** None. Unverified until it runs: the `m.box.map50` / `m.seg.map` attribute names against the installed Ultralytics version, and that `save_period=1` fits in /kaggle/working (about 20 MB per epoch for the s model).

## 2026-10-24 (Gemini baseline vs RipWatch comparison)
**Built:** scripts to score zero-shot Gemini Flash and fine-tuned RipWatch YOLO on the same 200 held-out frames with one scoring function. Not run on real data and no API was called. All logic was tested locally with stubbed `google.genai` and `ultralytics` on synthetic frames (28 checks: parser, scoring, sampling, resume, metrics.json shape).
- `ml/.env.example`, `ml/requirements.txt`. `.gitignore` already had `.env*` (covers `.env` and `ml/.env`), but that also hid `ml/.env.example`, so I added `!.env.example` and an explicit `ml/.env`.
- `ml/scripts/common.py`: repo-relative paths, `ml/.env` loading (python-dotenv, environment wins), `GEMINI_API_KEY` from env or the Kaggle Secret of the same name, ground-truth boxes from polygon labels.
- `download_data.py --splits` (default `train,val`; `val` alone for the baseline account). `test` is still refused.
- `prepare_yolo.py --splits` (not asked, but needed): with `val` only it builds just `test/` and skips `data.yaml`. Without it, the val-only cell order failed because `train/` was missing.
- `baseline_vlm.py`:
  - Sampling: 150 rip frames round-robin across rip videos plus 50 RipVIS-NR frames, seed 42, saved to `ml/results/eval_frames.txt` and reused if present.
  - One fixed prompt (`PROMPT_VERSION = "v1"`). It asks for Gemini's native box format, `[ymin, xmin, ymax, xmax]` on 0-1000 (agreed with the user), which is converted to normalized xyxy.
  - Requests: `--delay 6`, 429/5xx backoff from 30 s doubling to 300 s. When retries run out on 429 it stops cleanly (exit 2) and resumes on rerun.
  - Every response goes to `ml/results/baseline_raw.jsonl`. Unparseable answers are logged and count as no detection. Other API errors are logged and retried on the next run.
- `eval_compare.py`:
  - YOLO boxes at `--conf 0.25`, sorted by confidence. Gemini boxes from the jsonl.
  - One `score()` for both: image-level P/R/F2 and box-level P/R/F2 with greedy IoU >= 0.5. F2 = 5PR/(4P+R).
  - Writes `web/public/data/metrics.json` per the contract (box level, two entries, `heldOutFrames`, `notes`, no `fake`) and `ml/results/comparison.md` (both levels with TP/FP/FN).

**Decisions to check**
- Default model `gemini-3.8-flash`, the latest stable Flash on the Gemini models page as of today. The rate-limits page does not say whether it is on the free tier. If it is not, pass `--model` (for example `gemini-3.5-flash-lite`) to both scripts, after checking AI Studio.
- Temperature and thinking are left at defaults. Google's Gemini 3 docs say not to set temperature below 1.0 (it can cause looping and worse results), so the planned `temperature=0` was dropped. Responses are therefore not deterministic. The jsonl keeps the exact answers that were scored.
- Gemini "rip present" = `rip: true` or at least one box. YOLO = at least one box at conf >= 0.25.
- Box-level scoring uses YOLO's detection boxes, not masks, so both models are judged on boxes.
- The metrics.json entry is named "RipWatch (fine-tuned YOLO11s-seg)" whatever `--weights` points at.

**Files touched:** `.gitignore`, `ml/.env.example`, `ml/requirements.txt`, `ml/scripts/common.py`, `ml/scripts/baseline_vlm.py`, `ml/scripts/eval_compare.py`, `ml/scripts/download_data.py`, `ml/scripts/prepare_yolo.py`, `notes/ml.md`

**Next:** run the cells below on the baseline account, then `eval_compare.py` once `best.pt` exists. Commit `ml/results/` and the real `metrics.json`. That replaces the fake file, and `/results` drops its PLACEHOLDER badge.

**Blockers:** None. Unverified until run: free-tier access to the default model, and Kaggle Secrets being readable from a `!python` subprocess (if not, create `ml/.env` in the notebook instead).

### How to run in Kaggle (Gemini baseline + comparison)
Notebook settings: Internet on. Add-ons, Secrets: add `GEMINI_API_KEY` and attach it to this notebook. A GPU is only needed for the last step.

```
# 1. Clone the repo (public)
!git clone https://github.com/TejasNaik24/RipWatch.git
%cd /kaggle/working/RipWatch
```
```
# 2. Install
!pip install -q -r ml/requirements.txt
```
```
# 3. Only if Kaggle Secrets do not work: write the key to ml/.env (git-ignored)
# !echo "GEMINI_API_KEY=..." > ml/.env
```
```
# 4. Val split only (about 1.7 GB of images plus labels)
!python ml/scripts/download_data.py --splits val
```
```
# 5. Build /kaggle/working/yolo/test (official val = held-out test)
!python ml/scripts/prepare_yolo.py --splits val
```
```
# 6. Gemini baseline. Rerun this cell to resume after a rate-limit stop.
!python ml/scripts/baseline_vlm.py
# other model: !python ml/scripts/baseline_vlm.py --model gemini-3.5-flash-lite
```
```
# 7. Once best.pt exists (upload it from the training account as a Kaggle dataset)
!python ml/scripts/eval_compare.py --weights /kaggle/input/<your-dataset>/best.pt
# if step 6 used --model X, add: --baseline-model X
```
```
# 8. Bundle the outputs to download, then commit them from the laptop (Kaggle has no push credentials)
!tar czf /kaggle/working/ripwatch_results.tgz ml/results web/public/data/metrics.json
```
