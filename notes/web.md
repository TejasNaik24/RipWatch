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

## 2026-10-24 11:10 - Laptop-size layout fixes (written from the ML teammate's laptop)
**Note:** this entry was written from the ML teammate's laptop; same arrangement as before (web work in web/, web teammate not touching it). Not touched: `lib/data.ts`, `notes/contract.md`, anything in `web/public/data/`, and the frame-sync math in MaskedVideo.

**Fixed (the six items)**
1. **Command grid off-center.** The old grid was sized from the window height and centered, so a shorter window left empty side gutters. It now always fills the full content width: left edge and right edge equal the header's (checked at every size: grid 32 to W-32, header 32 to W-32). The side column is sized so the hero is exactly 16:9 whenever width is the limit (no letterbox bars), and it shrinks only when the window is too short. Hero and side-feed sizing live in `.rw-cmd-grid` in `app/globals.css`.
2. **Side feed tiles.** The CAM id is `whitespace-nowrap`; the full location name wraps onto a second line if needed, with no ellipsis. Caption row is 48px; the status pill no longer wraps.
3. **Alert card.** No fixed widths, no truncate; the message wraps, the Confidence and Active-for cells and the button keep their content width, gaps are smaller. It fits its content in every state (alert, acknowledged, clear with the long message, "View CAM 0x").
4. **Event log.** Messages are now short fixed labels ("Rip detected 90%", "Area clear", "Acknowledged"), never truncated, and wrap rather than cut if the column is very narrow. Only whole rows are shown: rows that do not fit in the panel are hidden (measured with a ResizeObserver), so nothing is half cut off.
5. **Results.** "How it was measured" and "Known limitations" moved to a full-width strip under the chart and headline card, so they size to their content; the chart takes whatever height is left, so the page fits without scrolling. Tested with a realistic 640-character `metrics.notes`, two models and no fake flag, at 1440x780.
6. **Nav focus box.** A real mouse click did not show the box in Chrome here (`:focus-visible` was false), so I could not reproduce it directly; probably it depends on the browser or on earlier keyboard use on the page. Made it deterministic: `components/InputModality.tsx` marks `<html data-input="pointer|keyboard">` from the last input, and CSS hides the ring in pointer mode. Checked: Tab shows a 2px ring; after a mouse click right after Tab the outline is `none`.

**Also fixed (not in the list, found while testing)**
- **Clip stayed hidden after a fast or cached load.** With the mp4 cached, `loadeddata` fired before React hydrated, so the handler never ran: the video played but stayed `invisible`, "0 of 3 streaming" showed, and the masks followed the fallback clock instead of the video. The existing mount check in MaskedVideo now also accepts a video that is already loaded (`readyState >= HAVE_CURRENT_DATA`). This only sets the "video is ready" state; the `frameIndex(t, fps)` math is unchanged. Four cached reloads in a row now all show "1 of 3 streaming".
- Line heights on a few big mono numbers and the hook title were `leading-none`, which my checker flagged as glyph boxes taller than the line box; changed to `leading-tight` / 1.15 (no visible change).

**Verified**
- eslint, tsc and `next build` pass.
- A checker (page scroll; anything past the viewport; text wider or taller than its box; ellipsis; elements clipped by an overflow-hidden parent; children sticking out of their card) run on `/`, `/compare`, `/results`, `/pipeline`, `/hook` at 1920x1080, 1512x982 and 1440x900 reported no issues and no scrolling on any route. Also clean at the shorter windows 1512x800 and 1440x780 (browser-viewport heights are shorter than the screen on a MacBook).
- Command at 1440x900 and 1440x780: no empty gutters, full location names, alert card complete in the alert, acknowledged and clear states, event log complete rows only.

**Not verified**
- Safari (macOS); only Chrome was tested. The focus fix does not depend on browser heuristics, but I have not seen it in Safari.
- The real Command page with all three real clips (clip1/clip2 mp4s do not exist yet), so the side feeds still show "Awaiting footage" in tests.
- Very narrow windows (under about 1300px wide) were not part of the brief and were not checked.

**Next:** when real clips and masks arrive, look at Command and Compare once at 1440x900 (the recording size) before recording.

## 2026-10-24 - Baseline renamed to Gemini 3.5 Flash Lite
**Folder note:** on the user's instruction this task also edited `ml/scripts/eval_compare.py` and `ml/scripts/baseline_vlm.py` (ML-owned), plus `README.md` and `docs/video-script.md`. Nothing in `web/public/data/` and no contract change.

**Built**
- The zero-shot baseline switches to Gemini 3.5 Flash Lite (free-tier quota). Every user-facing name now comes from the model id actually used, by one rule used in both languages:
  - `gemini-3.5-flash-lite` → "Gemini 3.5 Flash Lite (zero-shot)".
  - The first version number is kept; later numeric or `latest` tokens (dates, revisions) are dropped. For example, `gemini-2.5-flash-preview-05-20` → "Gemini 2.5 Flash Preview (zero-shot)".
- **`ml/scripts/eval_compare.py`:** the hardcoded `GEMINI_NAME` is replaced by `gemini_display_name(--baseline-model)`. That name goes into `metrics.json` (so /results shows it) and the `comparison.md` heading.
- **`ml/scripts/baseline_vlm.py`:** `DEFAULT_MODEL` is now `gemini-3.5-flash-lite` (was `gemini-3.8-flash`), so the README's plain `baseline_vlm.py` command runs the model the docs name. `eval_compare.py` and `baseline_video.py` take their default from it. Their cache is keyed by model, so any earlier 3.8-flash responses are not reused.
- **`web/lib/clips.ts`:** `geminiDisplayName(id)` (same rule) builds the /compare pane title for any id containing "gemini"; the raw id still shows underneath. When the file has no `model` field, the fallback is now "Gemini (zero-shot)", with no version claimed.
- **Docs:**
  - `README.md` now names Gemini 3.5 Flash Lite (id included) in Evaluation, Results TODO and the run command, and says we used it because of free-tier limits.
  - `docs/video-script.md` never said "Gemini Flash". Its metrics note now names the 3.5 Flash Lite baseline.

**Verified**
- Python and TypeScript give identical names for 7 ids (incl. uppercase, `models/` prefix, date and `-001`/`-latest` suffixes).
- `write_metrics`/`write_markdown` with the default id writes "Gemini 3.5 Flash Lite (zero-shot)" to metrics.json and the comparison heading.
- eslint, tsc, `next build` pass; `ml/tests/test_demo_clips.py` all pass.

**Not verified:** /compare in the browser with a real baseline file (the fake one's model is not a Gemini id). No API was called.

**Files touched:** `ml/scripts/eval_compare.py`, `ml/scripts/baseline_vlm.py`, `web/lib/clips.ts`, `README.md`, `docs/video-script.md`, `notes/web.md`

**Next:** after the real baseline run, check /compare and /results show "Gemini 3.5 Flash Lite (zero-shot)".

**Blockers:** None.

## 2026-10-24 14:35 - /results leads with image level (written from the web teammate's laptop; touches ml/ and the contract on purpose)
**Contract change, explained:** `metrics.json` gained optional fields (see `notes/contract.md` section 3 and `notes/ml.md`): per model `imageLevel` and `boxLevel` (counts plus f2/precision/recall), top level `ripFrames` and `noRipFrames`. The old top-level `f2/precision/recall` stay box level. It is backward compatible, and `web/lib/types.ts` mirrors it with the new fields optional.

**Built (`app/results/page.tsx`, `components/ResultsChart.tsx`, `lib/types.ts`)**
- Headline card "Rips found in 150 held-out frames": RipWatch 108 vs Gemini 3.5 Flash Lite 39, with proportional bars. The sentence under it ("Both models are about 95% precise; the difference is how many rips they catch") is computed from the two image-level precisions and only appears when both are at least 0.90 and within 0.05; otherwise a neutral precision/recall line shows.
- Main chart: image-level F2, precision, recall (RipWatch teal, baseline gray, same styling). `ResultsChart` takes `level`.
- "Stricter test: rip location (box IoU >= 0.5)": compact table with box-level F2/precision/recall.
- "How it was measured" is built from the JSON (frame counts, exact baseline name, RipWatch confidence parsed from `notes`).
- Fallback: if any model lacks `imageLevel`, the old box-level layout renders unchanged (including the PLACEHOLDER badge for `fake: true`). The real file has no `fake` key, so no badge.

**Verified**
- eslint, tsc, `next build` pass; `ml/tests/test_demo_clips.py` ALL PASS.
- `/results` at 1920x1080, 1512x982 and 1440x900 with the real file: no page scroll, nothing past the viewport, no text overflow, nothing sticking out of its card, no PLACEHOLDER text.
- Fallback checked by rewriting the fetched metrics in flight (imageLevel removed, `fake: true`): old layout and badge rendered, no scrolling.

**Not verified:** Safari; other window sizes; the headline/fallback wording with a three-model file (only RipWatch and the best baseline are shown in the headline card).

**Files touched:** `web/app/results/page.tsx`, `web/components/ResultsChart.tsx`, `web/lib/types.ts`, `notes/contract.md`, `ml/scripts/eval_compare.py`, `web/public/data/metrics.json`, `notes/web.md`

**Next:** check Compare with real clips and masks before recording. **Blockers:** None.

## 2026-10-24 11:45 - /story route for the video's title, stat and closing cards (written from the ML teammate's laptop)
**Note:** this entry was written from the ML teammate's laptop; same arrangement as before (web work, web teammate not touching it). Only new files plus one section in `docs/video-script.md`; no existing page, `web/lib` or `web/public/data/` file was touched, and nothing was added to the nav.

**Built**
- `/story`: full-screen, keyboard-driven, seven cards. Right Arrow / Space next, Left Arrow back, R restart. Stops at both ends, ignores held keys and Cmd/Ctrl/Alt combos, prevents page scroll on Space and arrows, never blocks rapid taps.
  1. Title: "RipWatch" / "Seeing the danger swimmers can't."
  2. 300,000+ drowning deaths worldwide in 2021 (World Health Organization)
  3. 80%+ of rescues by US surf beach lifeguards involve rip currents (United States Lifesaving Association)
  4. 1 in 5 beachgoers could spot a real rip current in person (Muriwai Beach field study, Natural Hazards and Earth System Sciences, 2021)
  5. 17 drownings in Lake Erie in 2025 (according to the Great Lakes Surf Rescue Project), with a small "Closer to home" line above (the Ohio angle, no branding)
  6. Bridge: "Rip currents look calm. That's what makes them deadly." ("deadly" is the one red word)
  7. Closing: "Rip currents are invisible. Now they don't have to be." then "RipWatch · HackOHI/O 2026" and "Tejas Naik · [Teammate name]"
- Same design system: navy with the top wash, teal accent, a faint drifting "waterline" of three thin teal lines behind everything. Text is sized from the stage (`cqw`/`cqh`), so it scales across window sizes. The stage sits above the app's top bar (z-index 50, own background), so the nav never shows and `TopBar.tsx` is unchanged.
- Motion: cards crossfade (old card fades and lifts 350ms, new rises 700ms, lines staggered). Numbers count up once each time a stat card appears (1.4s ease-out; "1 in 5" counts the 5 up from 1). Going back to a stat card replays it once. Reduced motion shows final values and no drift.
- Big numbers use the UI face with tabular digits, not the mono face: in mono the comma took a full cell and read "300 , 000+".
- `docs/video-script.md`: new "Story cards (`/story`)" section (keys, card table, where each card is recorded, caveats) and updated the Problem and Close screens to use it.

**Files:** web/app/story/page.tsx, web/app/story/story.css, web/components/story/{StoryStage.tsx, CountUp.tsx, cards.ts}, docs/video-script.md, notes/web.md.

**To fill in:** `TEAMMATE_NAME` in `web/components/story/cards.ts` (shows "[Teammate name]" on card 7).

**Verified**
- eslint, tsc and `next build` pass; `/story` is a static route and the other routes are unchanged.
- At 1920x1080, 1512x982 and 1440x900: all seven cards checked for off-screen, clipped or wider-than-box text and page scroll: none; the top bar is fully covered on every card. Real key presses for the sequence; a scripted run checked the stop at both ends, Left, R, repeat/modifier keys ignored, Space default prevented, and four rapid taps leaving exactly one card.
- Count-up sampled mid-animation (0, 54,274, 153,886 ... 300,000+); sources readable at 24px (1920) and above 18px at the smaller sizes.
- Reduced motion (stubbed `matchMedia`): final value at 250ms. No console errors.

**Check before recording the numbers**
- 17 Lake Erie drownings in 2025: I found it in news coverage but could not confirm it is the group's full-year total. Re-check on the Great Lakes Surf Rescue Project's tracker.
- 300,000+: WHO's own wording for 2021 is "about 300,000" (the 2024 report is cited as "more than 300,000" in the script).
- 1 in 5: the study's figure is 22%; say "about 1 in 5" in the voice-over.
- 80%+: a USLA-data study (NHESS 2019) found 81.9% of surf beach rescues; it rests on voluntary lifeguard-agency reporting.

**Not verified:** Safari; the waterline's look after video compression (it is faint by design; opacities are in `StoryStage.tsx` if it needs to be stronger); windows narrower than about 1300px.

## 2026-10-24 12:05 - /story wording: estimated 300,000, "At least 17" (written from the ML teammate's laptop)
**Note:** written from the ML teammate's laptop; same arrangement as before. Only `web/components/story/*`, `web/app/story/story.css` and `docs/video-script.md` changed.

**Changed**
- WHO card now reads "300,000" with the label "estimated drowning deaths worldwide in 2021" (no "+"), matching WHO's own "estimated 300,000" for 2021.
- Lake Erie card now reads "At least 17": "At least" is a small lead-in (new `preSmall` option in `CountSpec`, `.rw-story-pre`), and the 17 still counts up from 0. Source line unchanged: "According to the Great Lakes Surf Rescue Project".
- `docs/video-script.md`: card table, Story card notes, Problem narration ("an estimated 300,000", "at least 17 drownings"), Sources, plus a voice-over note to say "about 1 in 5" on the third card.

**Verified:** eslint, tsc and `next build` pass. At 1440x900: both cards free of off-screen or clipped text, no page scroll; the count on card 5 sampled 0, 3, 10, 14, 16, 17. Other sizes not rerun (all story sizes derive from the stage, and all seven cards passed at 1920x1080, 1512x982 and 1440x900 before this change).

**Still to check before recording:** the Lake Erie 17 against the Great Lakes Surf Rescue Project's tracker.

## 2026-10-24 12:30 - /story Lake Erie card without a number (written from the ML teammate's laptop)
**Note:** written from the ML teammate's laptop; same arrangement as before. Changed only `web/components/story/*`, `web/app/story/story.css`, `README.md`, `docs/video-script.md`.

**Changed**
- Lake Erie card (card 5) is now a text card with no number and no count-up: "Closer to home" / "Lake Erie has rip currents too." / "Rip currents are a recurring factor in Lake Erie drownings." / source "Great Lakes Surf Rescue Project". New `note` card kind in `cards.ts` and `StoryStage.tsx`. The "At least" lead-in code (`preSmall`, `.rw-story-pre`) was removed since nothing uses it.
- The "17" is gone from `README.md` and `docs/video-script.md` (card table, Problem narration, notes, Sources, TODO list). Older log entries in `notes/web.md` and `notes/ml.md` still mention it as history; they were not rewritten.
- The script now says the stat cards are cards 2-4 only, and that card 5 is an advocacy group's claim.

**Verified:** eslint, tsc and `next build` pass. Card 5 at 1920x1080 and 1440x900: no digits on the card, no off-screen or clipped text, no page scroll; card 6 unaffected.

**Still to check before recording:** that "a recurring factor in Lake Erie drownings" matches the Great Lakes Surf Rescue Project's own published wording (it is listed as an open item in the script).
