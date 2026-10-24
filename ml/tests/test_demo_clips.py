#!/usr/bin/env python3
"""Tests for the demo clip scripts (video_clip.py, infer_video.py, baseline_video.py) on synthetic video.

    python ml/tests/test_demo_clips.py

Needs numpy, opencv-python-headless and imageio-ffmpeg (all in ml/requirements.txt). Ultralytics and
google.genai are replaced by stubs in ml/tests/stubs/, so no model, GPU or API key is used. Everything is
written to a temp folder; the real web/public/data/ and ml/results/ are never touched.
"""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE / "stubs"))  # before the scripts import ultralytics / google.genai
sys.path.insert(0, str(REPO / "ml" / "scripts"))
import cv2, numpy as np, imageio_ffmpeg  # noqa: E402
import video_clip, infer_video, baseline_vlm, baseline_video  # noqa: E402

W, H, N = 640, 360, 180
RATE = "30000/1001"; FPS = 30000 / 1001
T = Path(tempfile.mkdtemp(prefix="ripwatch_test_"))
DATA = T / "data"
video_clip.LOCAL_DIR = T / "local"
baseline_video.CACHE_DIR = T / "cache"
FF = imageio_ffmpeg.get_ffmpeg_exe()
fails = []

def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  {extra}" if extra else ""))
    if not ok: fails.append(name)

def stamp(img, i):  # 10-bit frame index as 16px squares on row 0
    for b in range(10):
        img[0:16, b*16:(b+1)*16] = 255 if (i >> b) & 1 else 0

def read_stamp(img):
    return sum((1 << b) for b in range(10) if img[0:16, b*16:(b+1)*16].mean() > 127)

# synthetic source video
src = T / "beach.mp4"
p = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                      "-r", RATE, "-i", "-", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", str(src)],
                     stdin=subprocess.PIPE)
for i in range(N):
    img = np.full((H, W, 3), (120, 90, 40), np.uint8)
    cx, cy = 200 + i, 200 + int(10 * np.sin(i / 10))
    cv2.ellipse(img, (cx, cy), (70, 40), 0, 0, 360, (30, 30, 230), -1)
    stamp(img, i)
    p.stdin.write(img.tobytes())
p.stdin.close(); p.wait()

def run(mod, argv, env=None):
    old_argv, old_env = sys.argv, dict(os.environ)
    sys.argv = ["x"] + argv
    os.environ.update(env or {})
    try:
        mod.main(); return 0
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    finally:
        sys.argv = old_argv; os.environ.clear(); os.environ.update(old_env)


def run_fn(fn):
    try:
        fn(); return 0
    except SystemExit as e:
        return 1 if e.code else 0

common = ["--video", str(src), "--data-dir", str(DATA)]
weights = T / "best.pt"; weights.write_bytes(b"stub")

# 1. trim + smoothed inference
START, END = 2.0, 5.0
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "c1", "--start", str(START), "--end", str(END),
                       "--render", str(T / "render.mp4")] + common)
check("infer exit 0", rc == 0)
clip = DATA / "clips" / "c1.mp4"
w, h, fps, n = video_clip.probe(clip)
first = next(video_clip.iter_frames(clip))[1]
check("trim: clip frame 0 is source frame round(start*fps)", read_stamp(first) == round(START * FPS),
      f"{read_stamp(first)} vs {round(START * FPS)}")
check("trim: frame count = round((end-start)*fps)", n == round((END - START) * FPS), f"{n}")
check("fps unrounded", fps == FPS, repr(fps))
doc = json.loads((DATA / "masks" / "c1.ripwatch.json").read_text())
check("keys in contract order + smoothed", list(doc) == ["clipId", "model", "smoothed", "fps", "width", "height", "frames"], list(doc))
check("no fake key", "fake" not in doc)
check("model name", doc["model"] == "ripwatch-yolo11s-seg")
check("fps in JSON == clip fps", doc["fps"] == fps)
check("width/height", (doc["width"], doc["height"]) == (W, H))
check("one entry per decoded frame, i sequential", [f["i"] for f in doc["frames"]] == list(range(n)))
allpts = [pt for f in doc["frames"] for d in f["detections"] for pt in d["polygon"]]
check("coords are ints in bounds", all(isinstance(x, int) and isinstance(y, int) and 0 <= x <= W and 0 <= y <= H for x, y in allpts))
check("conf in [0,1]", all(0 <= d["conf"] <= 1 for f in doc["frames"] for d in f["detections"]))
gaps_s = [f["i"] for f in doc["frames"][5:] if not f["detections"]]
check("smoothed: no gaps after warmup", not gaps_s, str(gaps_s[:10]))
# polygon roughly covers the blob: centroid near true center
f30 = doc["frames"][30]["detections"][0]["polygon"]
src_i = round(START * FPS) + 30
cx = np.mean([p[0] for p in f30]); check("smoothed polygon tracks blob (x)", abs(cx - (200 + src_i)) < 15, f"{cx:.0f} vs {200 + src_i}")
wr, hr, fr, nr = video_clip.probe(T / "render.mp4")
check("render: same frame count and fps", (nr, fr, wr, hr) == (n, fps, W, H), f"{nr} {fr!r}")
check("clip sidecar written", (video_clip.LOCAL_DIR / "clips" / "c1.json").exists())

# 2. raw mode, reusing the clip
mtime = clip.stat().st_mtime_ns
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "c1", "--start", str(START), "--end", str(END), "--no-smooth"] + common)
raw = json.loads((DATA / "masks" / "c1.ripwatch.json").read_text())
check("raw: clip reused, not re-encoded", clip.stat().st_mtime_ns == mtime)
check("raw: smoothed false", raw["smoothed"] is False)
gaps_r = [f["i"] for f in raw["frames"] if not f["detections"]]
check("raw: flicker gaps present (every 4th frame)", len(gaps_r) >= n // 4 - 1, str(gaps_r[:6]))

# 3. no trim -> plain copy
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "c2"] + common)
check("copy: identical bytes", (DATA / "clips" / "c2.mp4").read_bytes() == src.read_bytes())
check("copy: frames = source frames", len(json.loads((DATA / "masks" / "c2.ripwatch.json").read_text())["frames"]) == N)

# 4. baseline
calls = T / "calls.txt"
env = {"GEMINI_API_KEY": "dummy", "STUB_CALLS": str(calls), "STUB_MODE": "ok"}
import google.genai as gg; gg.CALLS = str(calls)
rc = run(baseline_video, ["--clip-id", "c1", "--start", str(START), "--end", str(END), "--delay", "0"] + common, env)
check("baseline exit 0", rc == 0)
samples = baseline_video.sample_indices(n, fps, 1.0)
ncalls = len(calls.read_text().splitlines())
check("baseline: one call per sampled frame", ncalls == len(samples), f"{ncalls} calls, samples {samples}")
b = json.loads((DATA / "masks" / "c1.baseline.json").read_text())
check("baseline keys", list(b) == ["clipId", "model", "fps", "width", "height", "frames"], list(b))
check("baseline model = gemini model", b["model"] == baseline_vlm.DEFAULT_MODEL)
check("baseline frames = n", len(b["frames"]) == n and b["frames"][-1]["i"] == n - 1)
box = b["frames"][0]["detections"][0]
check("box conversion [ymin,xmin,ymax,xmax]/1000 -> pixel xyxy", box["box"] == [64, 90, 320, 270] and box["conf"] == 1.0, str(box))
check("baseline: boxes held on every frame", all(f["detections"] for f in b["frames"]))
rc = run(baseline_video, ["--clip-id", "c1", "--start", str(START), "--end", str(END), "--delay", "0"] + common, env)
check("baseline rerun: zero new calls", len(calls.read_text().splitlines()) == ncalls)
check("baseline: clip not re-encoded", clip.stat().st_mtime_ns == mtime)

# hold logic with sparse answers
recs = {0: {"parsed": {"boxes_xyxy": [[0, 0, .5, .5]]}}, 10: {"parsed": None}, 20: {"parsed": {"boxes_xyxy": [[.5, .5, 1, 1]]}}}
fr = baseline_video.hold_frames(25, [0, 10, 20], recs, 100, 100)
check("hold: 0-9 first box, 10-19 none (unparseable), 20+ second box",
      fr[9]["detections"][0]["box"] == [0, 0, 50, 50] and fr[10]["detections"] == [] and fr[19]["detections"] == []
      and fr[24]["detections"][0]["box"] == [50, 50, 100, 100])
check("sample indices at 29.97 fps", baseline_video.sample_indices(91, FPS, 1.0) == [0, 30, 60, 90])

# 5. quota exhausted -> exit 2, rerun resumes
env429 = dict(env, STUB_MODE="429")
rc = run(baseline_video, ["--clip-id", "c3", "--start", "0", "--end", "3", "--delay", "0", "--max-retries", "0"] + common, env429)
check("429: exits 2", rc == 2, str(rc))
check("429: no baseline json written", not (DATA / "masks" / "c3.baseline.json").exists())
before = len(calls.read_text().splitlines())
rc = run(baseline_video, ["--clip-id", "c3", "--start", "0", "--end", "3", "--delay", "0"] + common, env)
check("429: rerun completes", rc == 0 and (DATA / "masks" / "c3.baseline.json").exists())
check("429: rerun called each sample once", len(calls.read_text().splitlines()) - before == len(baseline_video.sample_indices(90, FPS, 1.0)))


# 7. downscale (--max-width)
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "d1", "--start", str(START), "--end", str(END),
                       "--max-width", "320"] + common)
dclip = DATA / "clips" / "d1.mp4"
dw, dh, dfps, dn = video_clip.probe(dclip)
check("downscale+trim: 320x180, same fps and frame count", (dw, dh, dfps, dn) == (320, 180, FPS, n), f"{dw}x{dh} {dn}")
check("downscale+trim: frame 0 is still source frame round(start*fps)", read_stamp(cv2.resize(next(video_clip.iter_frames(dclip))[1], (W, H))) == round(START * FPS))
dd = json.loads((DATA / "masks" / "d1.ripwatch.json").read_text())
check("downscale: JSON width/height = clip size", (dd["width"], dd["height"]) == (320, 180))
pts = [pt for f in dd["frames"] for d in f["detections"] for pt in d["polygon"]]
check("downscale: coords in bounds", pts and all(0 <= x <= 320 and 0 <= y <= 180 for x, y in pts))
cx = np.mean([p[0] for p in dd["frames"][30]["detections"][0]["polygon"]])
check("downscale: polygon in clip coordinates (blob x halved)", abs(cx - (200 + round(START * FPS) + 30) / 2) < 8, f"{cx:.0f}")

rc = run(infer_video, ["--weights", str(weights), "--clip-id", "d2", "--max-width", "320"] + common)
d2 = DATA / "clips" / "d2.mp4"
w2, h2, f2, n2 = video_clip.probe(d2)
check("downscale without trim: re-encoded, not copied", d2.read_bytes() != src.read_bytes() and (w2, h2, n2) == (320, 180, N), f"{w2}x{h2} {n2}")
m2 = d2.stat().st_mtime_ns
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "d2", "--max-width", "320"] + common)
check("downscale: same args reuse the clip", d2.stat().st_mtime_ns == m2)
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "d2", "--max-width", "0"] + common)
check("max-width 0: changing it invalidates the clip, and 0 means plain copy", d2.read_bytes() == src.read_bytes())
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "d3", "--max-width", "1920"] + common)
check("max-width above source width: plain copy", (DATA / "clips" / "d3.mp4").read_bytes() == src.read_bytes())

class A: pass
a = A(); a.video = src; a.start = None; a.end = None; a.max_width = 1920
b = A(); b.video = src; b.start = None; b.end = None; b.max_width = 320
check("baseline cache fingerprint includes max-width", video_clip.fingerprint(a, N, FPS) != video_clip.fingerprint(b, N, FPS))
check("rejects negative max-width", run(infer_video, ["--weights", str(weights), "--clip-id", "c9", "--max-width", "-5"] + common) != 0)


# 8. masks match the served clip exactly (downscaled + trimmed, odd scale 640 -> 400)
CW = 400
rc1 = run(infer_video, ["--weights", str(weights), "--clip-id", "m1", "--start", str(START), "--end", str(END),
                        "--max-width", str(CW)] + common)
rc2 = run(baseline_video, ["--clip-id", "m1", "--start", str(START), "--end", str(END), "--max-width", str(CW),
                           "--delay", "0"] + common, env)
served = DATA / "clips" / "m1.mp4"
decoded = [f for _, f in video_clip.iter_frames(served)]
sh, sw = decoded[0].shape[:2]
check("match: both scripts exit 0", (rc1, rc2) == (0, 0), f"{rc1} {rc2}")
check("match: served clip is downscaled", (sw, sh) == (400, 226) or (sw, sh) == (400, 224), f"{sw}x{sh}")
for kind in ("ripwatch", "baseline"):
    m = json.loads((DATA / "masks" / f"m1.{kind}.json").read_text())
    check(f"match {kind}: width/height == decoded served clip", (m["width"], m["height"]) == (sw, sh), f"{m['width']}x{m['height']}")
    check(f"match {kind}: one entry per decoded frame of the served clip", len(m["frames"]) == len(decoded))
# ripwatch polygons sit on the blob as it appears in the served file (raw mode: no EMA lag)
rc = run(infer_video, ["--weights", str(weights), "--clip-id", "m1", "--start", str(START), "--end", str(END),
                       "--max-width", str(CW), "--no-smooth"] + common, {"STUB_FLICKER": "0"})
m = json.loads((DATA / "masks" / "m1.ripwatch.json").read_text())
ious = []
for k in (0, 17, 45, 89):
    img = decoded[k]
    b, g, r = cv2.split(img)
    truth = (r > 150) & (g < 90) & (b < 90)
    pred = np.zeros((sh, sw), np.uint8)
    for d in m["frames"][k]["detections"]:
        cv2.fillPoly(pred, [np.array(d["polygon"], np.int32)], 1)
    ious.append((truth & (pred > 0)).sum() / max((truth | (pred > 0)).sum(), 1))
check("match ripwatch: polygon IoU with the blob in the served clip > 0.85", min(ious) > 0.85, " ".join(f"{x:.2f}" for x in ious))
bm = json.loads((DATA / "masks" / "m1.baseline.json").read_text())
check("match baseline: box scaled to the served clip", bm["frames"][0]["detections"][0]["box"] == [round(.1 * sw), round(.25 * sh), round(.5 * sw), round(.75 * sh)],
      str(bm["frames"][0]["detections"][0]["box"]))
# guard: masks sized for the source (not the clip) are refused
bad = dict(m, width=W, height=H)
check("guard: refuses JSON sized for the source video", run_fn(lambda: video_clip.write_masks(DATA, "m1", "ripwatch", bad)) != 0)
check("guard: refuses wrong frame count", run_fn(lambda: video_clip.write_masks(DATA, "m1", "ripwatch", dict(m, frames=m["frames"][:-1]))) != 0)
off = json.loads(json.dumps(m)); off["frames"][3]["detections"] = [{"polygon": [[0, 0], [sw + 50, 0], [0, 10]], "conf": 0.5}]
check("guard: refuses coordinates outside the clip", run_fn(lambda: video_clip.write_masks(DATA, "m1", "ripwatch", off)) != 0)
check("guard: rejected writes left the good file untouched", json.loads((DATA / "masks" / "m1.ripwatch.json").read_text()) == m)

# regression: a script that computes on the source video instead of the served clip must fail, not write JSON
real_prepare = video_clip.prepare_clip
def source_instead(args):
    real_prepare(args)
    return args.video
for mod, kind, extra, env_ in ((infer_video, "ripwatch", ["--weights", str(weights)], None),
                               (baseline_video, "baseline", ["--delay", "0"], env)):
    mod.video_clip.prepare_clip = source_instead
    try:
        rc = run(mod, extra + ["--clip-id", f"bug_{kind}", "--max-width", str(CW)] + common, env_)
    finally:
        mod.video_clip.prepare_clip = real_prepare
    check(f"regression {kind}: running on the source instead of the served clip exits non-zero", rc != 0, str(rc))
    check(f"regression {kind}: and writes no JSON", not (DATA / "masks" / f"bug_{kind}.{kind}.json").exists())

# 6. arg validation
check("rejects end <= start", run(infer_video, ["--weights", str(weights), "--clip-id", "c9", "--start", "3", "--end", "2"] + common) != 0)
check("rejects off > on", run(infer_video, ["--weights", str(weights), "--clip-id", "c9", "--on-thresh", "0.2", "--off-thresh", "0.4"] + common) != 0)

shutil.rmtree(T, ignore_errors=True)
print(f"\n{'ALL PASS' if not fails else f'{len(fails)} FAILED: {fails}'}")
sys.exit(1 if fails else 0)
