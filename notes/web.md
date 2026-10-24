# Web log

Owned by the web person. Append only; newest entry last. Format per entry: date/time, what was built, files touched, what's next, blockers.

## 2026-10-24 09:24 - Repo scaffold and fake data
**Built**
- Repo structure per spec: CLAUDE.md, README.md, .gitignore, notes/, ml/README.md placeholder.
- notes/contract.md: clips, masks (ripwatch + baseline), metrics, clip IDs.
- web/: Next.js (App Router, TypeScript, Tailwind, ESLint, npm), unmodified create-next-app output.
- FAKE data in web/public/data/, every JSON has top-level "fake": true: masks for all 3 clips x 2 models (90 frames, 1280x720, 30 fps; clip1 and clip2 have one drifting blob, ripwatch as polygon and baseline as box; clip3 is empty), and metrics.json with placeholder numbers (notes field says so).
- No mp4s yet. clips/ holds only .gitkeep; the player should render a dark placeholder when a clip is missing.

**Files touched**
CLAUDE.md, README.md, .gitignore, notes/*, ml/README.md, web/ (scaffold), web/public/data/** (fake, to be overwritten by ML).

**Next**
- Player component: video + canvas overlay, draw polygon/box from the frame index (currentTime * fps).
- Side-by-side baseline vs RipWatch view and a metrics panel reading metrics.json.
- Dark placeholder when a clip mp4 is missing.

**Blockers**
- Real clips and real model output from ML. Nothing blocking the UI work.
- Note for ML: when you replace fake files, they must not carry "fake": true.

## 2026-10-24 09:31 - Demo UI
**Built**
- `<MaskedVideo>` (web/components/MaskedVideo.tsx): mp4 plus canvas overlay, frame = floor(time * fps), polygon or box, red fill/outline, confidence label. Props: clipId, source, showMask, threshold (plus maskOpacity, playing, restartKey, clock refs). Redraws only on frame change; no React state per frame.
- If a clip mp4 is missing it falls back to a dark "NO SIGNAL" panel with a synthetic clock, so masks still animate. Real clips are picked up with no code change.
- `/` command dashboard: 3 feeds, status pills (CLEAR / pulsing RIP DETECTED), live timestamps, click to focus a feed (Esc or Back to return), slide-in alert card, threshold slider, event log.
- `/compare`: baseline left, RipWatch right, shared clock (left is master), one play/pause, restart, clip picker.
- `/results`: Recharts F2/precision/recall per model from metrics.json, best-F2 card, placeholder Limits panel, "PLACEHOLDER DATA" badge while metrics.json has fake: true.
- `/hook`: full-screen clip, "Where would you swim?". Keys: M fade mask in/out, Space play/pause, R restart, 1-3 switch clip. No chrome.
- Data loads from /data/... per the contract; contract unchanged. Camera names and locations live in web/lib/clips.ts (not in the contract).

**Files touched**
web/app/{layout.tsx,globals.css,page.tsx,compare/,results/,hook/}, web/components/*, web/lib/*, web/package.json (+recharts).

**Verified**
Lint, tsc and build pass. Checked all four routes at 1920x1080 in the browser with the fake data. Not verified: frame pacing (the browser pane was hidden, so rAF timing could not be measured) and playback with a real mp4 (none exist yet).

**Next**
- Once ML drops real clips and masks: check mask alignment on real video, tune threshold default (DEFAULT_THRESHOLD in web/lib/clips.ts) and camera names.
- Replace the placeholder Limits text with real limits.
- Do a recorded dry run of the 3-minute flow.

**Blockers**
- Need real mp4s in web/public/data/clips/ (ML).

## 2026-10-24 - Real clip test, /pipeline, video script
**Written from the ML teammate's laptop** (they did web work for this task while the web person was on Kaggle). CLAUDE.md folder ownership was waived for this task only, on the user's instruction.

**Built**
- Real clip test. Downloaded RipVIS val video `RipVIS-NR-004.mp4` from Hugging Face (`Irikos/RipVIS`, `val/videos/`) and saved it as `web/public/data/clips/clip3_norip.mp4`. No JSON in `web/public/data/` was edited.
- ffprobe of that file, to check against the mask JSON later: **1920x1080**, h264, **30000/1001 fps (29.97)**, **19.386 s**, 581 frames, square pixels. The fake `clip3_norip` masks say 1280x720 at 30 fps over 90 frames, so they do not match. That is expected for fake data. Real masks should use `width: 1920`, `height: 1080`, and fps 30000/1001 (a rounded 30 drifts about 0.6 frame over the clip), with a frame count that matches the video.
- Checked clip3 in the browser: plays on `/` (CAM 03, CLEAR), `/compare` (both panes, in sync within ~0.05 s, CLEAR) and `/hook` (key 3, pillarboxed correctly, no mask drawn). Correct 16:9 aspect, no console errors. No playback bugs found, so no player changes. The 404 on `/hook` is `clip1_obvious.mp4`, because hook starts on clip 1 and that mp4 does not exist yet.
- `/pipeline` (web/app/pipeline/page.tsx): animated five-stage diagram (Beach camera, Video frames, RipWatch model (fine-tuned YOLO11-seg), Temporal smoothing, Lifeguard alert) plus a dataset line underneath. Pure CSS animation (keyframes at the bottom of globals.css), respects reduced motion. Added a Pipeline link in TopBar.
- `docs/video-script.md`: 3:00 script with timestamps, narration and the route to record for each section. Every statistic is `[TODO: verified number]`.
- `.gitignore`: added `web/public/data/clips/*.mp4`. The repo is public and the RipVIS license is non-commercial, so the dataset video is not committed. Anyone cloning must add their own clip mp4s.

**Files touched**
web/app/pipeline/page.tsx, web/app/globals.css, web/components/TopBar.tsx, docs/video-script.md, .gitignore, notes/web.md, web/public/data/clips/clip3_norip.mp4 (local only, ignored).

**Verified**
eslint and tsc pass. Loaded `/pipeline` after a clean dev-server restart: sweep and packets animate in order and loop, no console errors, no overflow at 1920 wide. A dev server that was already running served stale HTML/CSS after the TopBar edit (hydration error, no animation); `rm -rf .next` and a restart fixed it. Not run: `next build`.

**Needs checking before recording**
- The `/pipeline` dataset line ("184 expert-annotated videos, 10 countries") is wording supplied by the user. The dataset card confirms 184 videos (150 with annotated rips) but not the country count or "expert-annotated". It lives in `DATASET_LINE` in `web/app/pipeline/page.tsx`.

**Next**
- Replace the fake masks and `metrics.json` with real ones (ML), then re-check mask alignment on the real clips.
- Fill the TODOs listed at the end of `docs/video-script.md`.

**Blockers**
- Real clip1 and clip2 videos and all real masks (ML).
