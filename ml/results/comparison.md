# Gemini 3.5 Flash Lite (zero-shot) vs RipWatch on held-out frames

- Frames: 200 from the official RipVIS val split (150 rip across 30 videos, 50 no-rip), list in `ml/results/eval_frames.txt`
- Gemini: `gemini-3.5-flash-lite`, prompt `v1`, 0 unparseable responses (counted as no detection)
- RipWatch: `ml/weights/best.pt`, conf >= 0.25, imgsz 640
- Box level: greedy matching at IoU >= 0.5 against boxes around the labelled polygons. F2 = 5PR/(4P+R)
- Image level also has true negatives: Gemini 3.5 Flash Lite (zero-shot) TN = 48, RipWatch (fine-tuned YOLO11s-seg) TN = 45

## Image level: is there a rip?

| Model | TP | FP | FN | Precision | Recall | F2 |
|---|---|---|---|---|---|---|
| Gemini 3.5 Flash Lite (zero-shot) | 39 | 2 | 111 | 0.951 | 0.260 | 0.304 |
| RipWatch (fine-tuned YOLO11s-seg) | 108 | 5 | 42 | 0.956 | 0.720 | 0.757 |

## Box level: IoU >= 0.5, greedy

| Model | TP | FP | FN | Precision | Recall | F2 |
|---|---|---|---|---|---|---|
| Gemini 3.5 Flash Lite (zero-shot) | 4 | 37 | 214 | 0.098 | 0.018 | 0.022 |
| RipWatch (fine-tuned YOLO11s-seg) | 105 | 58 | 113 | 0.644 | 0.482 | 0.507 |
