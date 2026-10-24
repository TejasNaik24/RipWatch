# RipWatch

RipWatch watches beach camera video and outlines rip currents in red, so lifeguards can spot them sooner.

## The problem

- Drowning killed more than 300,000 people worldwide in 2021 (WHO).
- In the United States, rip currents cause an estimated 100+ deaths a year and more than 80% of rescues by surf beach lifeguards (USLA).
- They are hard to see: in a field study at Muriwai Beach, New Zealand, only 22% of beachgoers could identify a real rip current in person.
- It is not only an ocean problem: Lake Erie saw 17 drownings in 2025, according to the Great Lakes Surf Rescue Project.

Lifeguards cannot watch every stretch of water at every moment. RipWatch is a second pair of eyes on the camera feed.

## How it works

1. **Camera video in.** A fixed beach camera (in the demo, pre-recorded RipVIS validation clips).
2. **Segmentation per frame.** A YOLO11s-seg model fine-tuned on RipVIS outlines each rip current on every frame.
3. **Temporal smoothing.** A per-pixel rip heatmap is averaged over time (exponential moving average) and thresholded with hysteresis. Each region's confidence is the mean heatmap value inside it. This keeps the outline steady instead of flickering frame to frame.
4. **Alert.** The dashboard paints the rip red, flips the camera status to RIP DETECTED and raises an alert card for the lifeguard.

The demo is fully static. The model runs offline (`ml/`) and writes clips plus per-frame polygons as JSON into `web/public/data/` (format in [notes/contract.md](notes/contract.md)). The Next.js app (`web/`) plays the clips and draws the masks on a canvas in sync with the video. There is no backend and no live model.

## Dataset

[RipVIS](https://huggingface.co/datasets/Irikos/RipVIS) (CVPR 2025): 184 videos, 212,328 frames, footage from 10 countries, with instance segmentation of rip currents.

RipVIS is licensed **CC BY-NC 4.0 (non-commercial)**. RipWatch is a non-commercial hackathon research demo. The dataset videos are not committed to this repository. The only dataset excerpts here are small contact sheets in [docs/clip-candidates/](docs/clip-candidates/), with attribution.

## Model

YOLO11s-seg (Ultralytics), starting from COCO-pretrained weights and fine-tuned on the RipVIS train split ([ml/scripts/train.py](ml/scripts/train.py)). Defaults: 640 px, up to 40 epochs, early stopping after 10 epochs without improvement. The model is selected on a dev set carved out of train by whole video, so no frame of a held-out video is seen during training or model selection.

## How we evaluate

- **Held-out data:** the official RipVIS validation videos. They are never used for training or model selection.
- **Metric:** F2, which weights recall above precision, because missing a rip is worse than a false alarm. We also report precision and recall.
- **Baseline:** zero-shot Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`). We used Flash Lite because of free-tier API limits.
  - It runs on the same 200 held-out frames (150 rip frames spread across the rip videos, plus 50 no-rip frames, fixed seed).
  - It gets one fixed prompt and is asked for boxes in its native format (`[ymin, xmin, ymax, xmax]` on a 0-1000 scale), which we convert.
- **Scoring:**
  - One scoring function scores both models ([ml/scripts/eval_compare.py](ml/scripts/eval_compare.py)), at image level and at box level.
  - At box level, a predicted box is correct if it overlaps an unmatched ground-truth box with IoU of 0.5 or more.
  - RipWatch is judged on its boxes, so both models are compared on the same footing.

## Results

**Out of 150 held-out frames with a rip current, Gemini 3.5 Flash Lite flagged 39. RipWatch flagged 108.** Both had about 95% precision, so the difference is recall: 0.26 vs 0.72. Image-level F2: 0.30 vs 0.76.

**Image level** ("is there a rip in this frame?"), 200 frames (150 rip, 50 no-rip):

| Model | TP | FP | FN | Precision | Recall | F2 |
|---|---|---|---|---|---|---|
| Gemini 3.5 Flash Lite (zero-shot) | 39 | 2 | 111 | 0.951 | 0.260 | 0.304 |
| RipWatch (fine-tuned YOLO11s-seg) | 108 | 5 | 42 | 0.956 | 0.720 | 0.757 |

**Box level** (IoU >= 0.5), the stricter location metric:

| Model | TP | FP | FN | Precision | Recall | F2 |
|---|---|---|---|---|---|---|
| Gemini 3.5 Flash Lite (zero-shot) | 4 | 37 | 214 | 0.098 | 0.018 | 0.022 |
| RipWatch (fine-tuned YOLO11s-seg) | 105 | 58 | 113 | 0.644 | 0.482 | 0.507 |

Full table: [ml/results/comparison.md](ml/results/comparison.md). Both models are scored by the same function ([ml/scripts/eval_compare.py](ml/scripts/eval_compare.py)).

Limitations of this comparison:
- **Small sample.** 200 frames (150 rip, 50 no-rip) from held-out RipVIS validation videos. One run, no repeated trials.
- **Weak baseline by design.** Gemini 3.5 Flash Lite is a lightweight model, used zero-shot with one fixed prompt, chosen because of free-tier limits. This says nothing about other Gemini models or other general-purpose models. It was also not built for precise localization, so the image-level result is the fairer comparison.
- **False alarms.** RipWatch flagged a rip on 5 of the 50 no-rip frames (Gemini 3.5 Flash Lite: 2 of 50).
- **Threshold.** RipWatch's 0.25 confidence threshold was chosen from the dev-set F1 curve (`MaskF1_curve.png` in the training output), not from test data.

## Known limitations

- **Advisory only.** RipWatch points a lifeguard's attention. It does not replace trained judgment and should never close or open a beach on its own.
- **No flash rips.** It is built for rip currents that persist across many frames. Short-lived flash rips are out of scope.
- **Not tested on live cameras.** Everything was evaluated on recorded RipVIS video. It has not been run on a live camera feed.
- **Rain, fog and night are untested.**

## Running it

### ML (`ml/`)

Python 3.10+. Training and evaluation are meant for a Kaggle notebook with a GPU; the demo-clip scripts also run on a laptop CPU.

```bash
pip install -r ml/requirements.txt
```

Data and training (Kaggle):

```bash
python ml/scripts/download_data.py                  # RipVIS train/val subset, never test
python ml/scripts/prepare_yolo.py                   # YOLO-seg dataset; official val becomes the held-out test set
python ml/scripts/train.py                          # fine-tune YOLO11s-seg (--smoke for a quick check)
```

Evaluation (needs `GEMINI_API_KEY` in `ml/.env`, see `ml/.env.example`):

```bash
python ml/scripts/baseline_vlm.py                   # Gemini 3.5 Flash Lite on the 200 held-out frames (rerun to resume)
python ml/scripts/eval_compare.py --weights best.pt # scores both, writes web/public/data/metrics.json
```

Demo clips (writes `web/public/data/clips/` and `masks/`):

```bash
python ml/scripts/find_clips.py                     # shortlist val clips, see docs/clip-candidates/
python ml/scripts/infer_video.py --weights best.pt --video ml/data/videos/RipVIS-053.mp4 --clip-id clip1_obvious --start 0 --end 15
python ml/scripts/baseline_video.py --video ml/data/videos/RipVIS-053.mp4 --clip-id clip1_obvious --start 0 --end 15
python ml/tests/test_demo_clips.py                  # synthetic tests, no model or API key needed
```

Full step-by-step commands are in [notes/ml.md](notes/ml.md).

### Web (`web/`)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 for the Command dashboard. Other screens: `/compare` (baseline vs. RipWatch on the same clip), `/results`, `/pipeline`, and `/hook` (full-screen opener, press `M` to reveal the mask). Clip mp4s are git-ignored (dataset license), so generate them with the demo-clip commands above first. Without them, the feeds show NO SIGNAL.

## Built at HackOHI/O 2026

Everything in this repository was built during HackOHI/O 2026: the data preparation, training and evaluation scripts, the temporal smoothing, the demo-clip pipeline, and the web app.

What already existed and we used:

- **RipVIS dataset** (CC BY-NC 4.0), for training and evaluation data.
- **Ultralytics YOLO11** and its COCO-pretrained `yolo11s-seg` weights, as the starting point for fine-tuning.
- **Gemini API**, for the zero-shot baseline.
- **Next.js**, for the web app (plus its usual open-source libraries, e.g. Tailwind CSS and Recharts).

## Team

- Tejas Naik
- [your name]

## Repository layout

| Folder | What |
|---|---|
| `ml/` | Data, training, evaluation and demo-clip scripts |
| `web/` | Next.js demo app |
| `docs/` | Video script, demo clip candidates |
| `notes/` | Data contract and team logs |
