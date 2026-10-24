# Data contract

Everything is static files under `web/public/data/`. Only the ML person writes there. The web app only reads.

Changing this file requires a note in your own log and a flag to the user.

## 1. Clips

`web/public/data/clips/{clipId}.mp4`: the raw video with no overlay.

## 2. Masks

`web/public/data/masks/{clipId}.ripwatch.json` (fine-tuned model) and `web/public/data/masks/{clipId}.baseline.json` (baseline model). Shape:

```json
{
  "clipId": "clip1_obvious",
  "model": "ripwatch-yolo11s-seg",
  "fps": 30, "width": 1280, "height": 720,
  "frames": [
    { "i": 0, "detections": [
      { "polygon": [[x,y],[x,y],...], "conf": 0.87 }
    ]}
  ]
}
```

- Coordinates are pixels in the original video size (`width` x `height`).
- Baseline detections may use `"box": [x1,y1,x2,y2]` instead of `"polygon"`.
- A frame with no detections has `"detections": []`.
- `i` is the frame index, starting at 0.

## 3. Metrics

`web/public/data/metrics.json`:

```json
{ "models": [ { "name": "Zero-shot VLM", "f2": 0.0, "precision": 0.0, "recall": 0.0 } ], "heldOutFrames": 0, "notes": "" }
```

## 4. Clip IDs

- `clip1_obvious`
- `clip2_sneaky`
- `clip3_norip`

## Fake data

While the real model output is not ready, files may carry a top-level `"fake": true`. Real files must not have it. The web app may ignore the key.
