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
