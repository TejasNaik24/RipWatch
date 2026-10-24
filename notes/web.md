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

## 2026-10-24 10:50 - Full visual redesign (written from the ML teammate's laptop)
**Note:** this entry was written from the ML teammate's laptop. For this task only, the user had the ML teammate do web work while the web teammate was not touching web/. Unchanged: notes/contract.md, lib/data.ts, lib/useRipStatus.ts, anything in web/public/data/, the MaskedVideo frame sync (frame = floor(currentTime * fps)) and the PLACEHOLDER DATA badge condition (`metrics.fake`).

**Direction**
- Calm coastal operations console, based on research into Surfline cam pages, VMS and alarm consoles (ISA-101, Genetec, Milestone), NWS rip current pages, and the Vercel Geist / Linear dark systems.
- Navy surfaces in three levels, one accent (sea glass #4fb8ac) for clear, selected and interactive states, and red (#ff3b3b) only for an active rip detection: mask, alert frame, alert badge, alert card and active-alert count.
- Color is always paired with a shape: triangle for rip, circle-check for clear.
- Type: Public Sans for UI, IBM Plex Mono only for timestamps, IDs and numbers. Sentence-case labels; uppercase letter-spaced labels removed.
- Tokens and shared button, segmented and panel classes live in app/globals.css. New one-style icon set in components/Icons.tsx.

**Per page**
- **Global:**
  - New nav with a sea-glass logo mark (not red) and an underlined active link, "Monitoring" status and a mono clock.
  - Consistent buttons with focus-visible rings (2px sea glass).
  - Route crossfade via React `<ViewTransition>` (components/PageTransition.tsx) with the nav anchored. `prefers-reduced-motion` disables animations.
  - `devIndicators: false` in next.config.ts, so the Next dev badge is not in recordings.
- **Command (/):**
  - One large feed plus a strip of the other two (click a tile or press 1-3 to switch), sized from the container so the hero height equals the strip and nothing overflows. Feeds stay mounted, so switching never restarts video or re-fires alerts.
  - CCTV-style overlays: camera and location, "Live" only when footage is playing, and a mono timestamp.
  - The Network status box is replaced by a compact status row: "x of 3 streaming" and an active-alert count, red only when above 0.
  - Under the hero is a status panel that becomes the alert card on detection: red edge and tint, confidence, "Active for" timer, and Acknowledge. It pulses until acknowledged, then stays steady red. Acknowledging is logged. When the hero is clear but another camera is alerting, the panel shows "View CAM 0x".
  - Slim event log with severity icons and time-only stamps.
  - Missing clips show a calm "Awaiting footage" placeholder, placed low in the frame so masks stay readable.
  - New files: components/FeedTile.tsx, components/EventLog.tsx; AlertCard.tsx rewritten.
- **Compare (/compare):**
  - Two large synced panes (about 916x515 each).
  - Titles come from each mask file's `model` field. If the field is missing or the file fails to load, the fallback is "Gemini Flash (zero-shot)" / "RipWatch (fine-tuned)" (lib/clips.ts), hidden for up to 1s so there is no flash.
  - New `tone` prop on MaskedVideo: baseline boxes draw in neutral slate and the baseline status chip is neutral ("Detection"). Only RipWatch is red.
  - Playback bar: Play/Pause, Restart, shared clock readout, and a legend.
- **Results (/results):**
  - Chart grouped by metric (F2, Precision, Recall), one bar per model. RipWatch is sea glass (the user chose this over red) and other models are neutral grays. Legend, y-axis 0-1, values on the bars, and it fits at 1080.
  - Headline card: RipWatch F2 against the best other model's F2, plus the difference. "How it was measured" shows `metrics.notes`.
  - "Known limitations" replaces the placeholder list with honest statements and no numbers.
  - The PLACEHOLDER DATA badge text and its `metrics.fake` condition are unchanged; only its style changed (neutral dashed).
- **Pipeline (/pipeline):**
  - Smaller, balanced type; one icon style; the model card in sea glass instead of red; the teal sweep animation kept.
  - Dataset line is now exactly "Trained on RipVIS: 184 videos, 212,328 frames, 10 countries".
- **Hook (/hook):** full-bleed video, 88px "Where would you swim?", softer gradient, smoother mask fade. Keys unchanged.

**Files touched**
web/app/{globals.css, layout.tsx, page.tsx, compare/page.tsx, results/page.tsx, pipeline/page.tsx, hook/page.tsx}, web/components/{TopBar, Dashboard, AlertCard, StatusPill, ThresholdControl, LiveClock, ResultsChart, MaskedVideo}.tsx, new web/components/{Icons, PageTransition, FeedTile, EventLog}.tsx, web/lib/clips.ts, web/next.config.ts, notes/web.md.

**Verified**
- eslint, tsc and `next build` pass; all routes are static.
- At an emulated 1920x1080 viewport (dev and production build): every route has scrollWidth x scrollHeight exactly 1920x1080, so no overflow. No console errors except the expected 404s for the missing clip1/clip2 mp4s.
- Fake detections on CAM 01/02 escalate (red frame, badge, alert card, pulse). Acknowledge stops the pulse and logs.
- CAM 03 (real clip3 mp4) plays and stays Clear. Switching the hero by click and by keys keeps the video playing (no restart) and adds no duplicate log entries.
- Compare shows the `model` fields; the fallback labels show when the mask requests fail. Both panes play clip3 within about 0.01s.
- Results shows 9 bars with values. Pipeline dataset line text matches exactly.
- Hook fades the mask on M (opacity 0 → 1 over about 1.2s).
- Keyboard focus ring visible. View transitions fire on nav clicks.

**Not verified**
- Real clip1/clip2 playback and real masks/metrics (none exist yet).
- The reduced-motion behavior in a browser; the CSS rule is in place but DevTools here cannot emulate the media feature.
- Safari/Firefox view transitions; they fall back to no animation.
- The dataset figures 212,328 frames and 10 countries: these are the user's wording. The RipVIS dataset card confirms 184 videos but does not state the frame or country count. Check them against the paper before recording.
- Surfline condition colors and some VMS vendors could not be checked during research.

**Next**
- Once ML drops real clips and masks, re-check mask alignment on real video and the Compare labels (they will show whatever `model` the real files carry).
- Record a dry run of the 3-minute flow.

**Blockers**
- Real clip1/clip2 mp4s and real model output (ML).

## 2026-10-24 10:55 - Frame epsilon, baseline labels, Compare display names (written from the ML teammate's laptop)
**Note:** this entry was written from the ML teammate's laptop; same arrangement as the redesign: I did web work in web/ and the web teammate was not touching it. Nothing in `web/public/data/`, `notes/contract.md` or `lib/data.ts` was changed.

**Built**
1. **Frame index epsilon.** New `lib/frames.ts` exports `frameIndex(t, fps) = floor(t * fps + 1e-3)`. `MaskedVideo.tsx` was the only place a frame index is computed and now calls it, so the sync logic is otherwise unchanged. Checked in Node at 30000/1001 fps: the old `floor(t * fps)` landed one frame early at 2,208 of 20,000 exact frame starts (about 11%); the new formula at 0, and mid-frame times still map to the right frame.
2. **Baseline detections.** For `source === "baseline"`:
   - the label reads "Gemini" with no percentage (RipWatch keeps "RIP nn%");
   - the alert-threshold filter is skipped, because Gemini returns no score and every box carries conf 1.0. Checked in the browser: with the threshold at 95% the baseline box stays and RipWatch's fake 90% detection is filtered out. The status chip on the baseline side was already neutral ("Detection"), with no percentage.
3. **Compare display names.** New `modelDisplay()` in `lib/clips.ts`: an id starting with "ripwatch" shows "RipWatch (fine-tuned)", an id containing "gemini" shows "Gemini Flash (zero-shot)" (both case-insensitive), with the raw id in small mono text underneath. Any other id is shown as is, with no second line (today's fake baseline file says `baseline-yolo11s-seg`, so it shows that until the real Gemini file arrives). A missing or blank `model`, or a mask file that fails to load, still falls back to the per-side titles after the same 1s wait. The pane header is now a fixed 76px with the raw-id line always reserved, so both panes stay level (checked: both videos start at the same y).

**Files touched:** web/lib/frames.ts (new), web/components/MaskedVideo.tsx, web/lib/clips.ts, web/app/compare/page.tsx, notes/web.md

**Verified:** eslint, tsc and `next build` pass. In the browser at 1920x1080: Compare with the baseline file's `model` rewritten in flight to "gemini-3.8-flash" showed "Gemini Flash (zero-shot)" over `gemini-3.8-flash` and "RipWatch (fine-tuned)" over `ripwatch-yolo11s-seg`; with mask requests blocked it showed the fallback titles with no raw ids; page height still exactly 1080; Command still shows "RIP 90%" / "RIP 55%" labels and the alert card; no console errors.

**Not verified:** playback against a real fractional-fps clip with real masks (none yet); real Gemini baseline files (the demo scripts are written but not run).

**Next:** once ML writes the real `*.baseline.json`, confirm its `model` field contains "gemini" so the friendly name and raw id show.
