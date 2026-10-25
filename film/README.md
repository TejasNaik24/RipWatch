# RipWatch film

Standalone animated scenes for the judging video, in a calm 3Blue1Brown / startup-launch style. They are **not** part of the Next.js app: plain HTML, one file per scene, GSAP from cdnjs. Scene 07 is a live recording of the real app, so it has no file here.

Each scene is a fixed **1920×1080 stage scaled to fit the window** (letterbox bars match the scene background). Record the browser window full screen with a screen recorder.

## How to record

1. Open `film/index.html` (double-click, or serve the repo root). It lists every scene.
2. Open a scene, press `F11` / full screen, start the recorder.
3. Press **Space** or **→** for the next beat.
4. **R** restarts the scene (back to its empty first frame) if you need a retake.
5. **P** pauses or resumes everything that is animating (beats and loops). **B** steps back one beat: the page reloads and replays the previous beat from its start (from beat 1 it goes back to the empty first frame). Neither shows anything on screen. Pressing Space while paused resumes first.

Pressing a key while a beat is still playing finishes that beat; the next press starts the next beat. Held keys are ignored. Timings per beat are in [`TIMING.md`](TIMING.md). Add `?speed=N` to any scene's URL to play all its animation N times faster (default 1; `03-definition.html?speed=1.5`); it can be combined with `skip`, and R and B keep it. CSS-driven bits (the blinking cursor in 01) and the video in 02 are not sped up. If a change to `assets/stage.js` seems to have no effect, hard-reload the page (Chrome caches it). Open a scene with `?skip=N` (for example `03-definition.html?skip=2`) to start with the first N beats already played, to pick up a take mid-scene.

Scenes 02 and 08 ignore Space until their media has loaded (`Film.hold` in `assets/stage.js`): 02 waits for the video's `canplaythrough`, 08 for all thumbnails, each for at most 6 s, after which 02 shows its placeholder and 08 uses whichever thumbnails loaded. If the first press seems dead, wait a moment.

Internet access is needed once per page load (GSAP is loaded from cdnjs, pinned to 3.12.5 with an integrity hash). Fonts are embedded, so everything else works from `file://`.

## Scenes

| File | Palette | Beats (one key press each) |
|---|---|---|
| `01-hook.html` | White | 1. "Where / would / you / swim" rise in one by one (0.25 s each), slightly zooming. 2. A cursor blinks, "?" types in. 2.6 s in all |
| `02-ocean.html` | White → navy | 1. The ocean video fades in, "Perhaps the ocean?". 2. "But…" as the palette turns dark. Needs `media/ocean.mp4`. 4.0 s in all |
| `03-definition.html` | Navy | 1. "What is a rip current?" with a drawn underline. 2. The definition slides up, source: National Weather Service. 3. Diagram: waves roll in, one channel flows out. 4. "How do you spot one?" (source: National Weather Service); the diagram dims behind it. 5-8. One clue per beat, each with a short label and a callout arrow: "A gap in the breaking waves", "Choppy, churning water", "Darker water", "Foam or debris drifting out to sea". 9. "These clues are subtle. Most people miss them." The clues are general NWS guidance, not a claim about which features RipWatch uses. About 7.4 s for beats 4-9 |
| `04-stakes.html` | Navy | 1. 300,000 (WHO). 2. 80%+ (USLA). 3. 1 in 5 (Muriwai study, NHESS 2021). 4. Rip currents have taken lives on Lake Erie (Fox 8 Cleveland, WJW). Numbers count up |
| `05-intro.html` | Navy | 1. The logo draws itself, the wordmark appears. 2. "A fine-tuned computer vision model that sees rip currents." |
| `06-concept.html` | Navy | 1. Cameras pulse on an illustrated beach. 2. Viewfinder brackets, "RipWatch runs on the cameras beaches already have". 3. A red rip appears, an alert line reaches a tower, "Lifeguard alerted." |
| *07* | App | Live screen recording of the real app (not in this folder) |
| `08-build.html` | Navy | 1. "YOLO11s-seg" model card. 2. "Trained on Kaggle", two T4 chips. 3. A stream of frames flows in, "RipVIS: 184 videos from 10 countries". Uses `media/thumbs/` |
| `09-benchmarks.html` | Navy | 1. "Tested on footage it never saw". 2. Gemini bar fills to 39 / 150. 3. RipWatch bar fills to 108 / 150. 4. "Rip frames correctly flagged. Both about 95% precise." |
| `10-limits.html` | Navy | 1. "A rip RipWatch missed." with the image. 2-4. Three limits, one per press. Uses `media/miss.png` |
| `11-close.html` | Navy | 1. "Rip currents are invisible." 2. "Now they don't have to be." 3. Logo, "RipWatch · HackOHI/O 2026", team names |

## Media to drop in

Everything in `media/` is optional: each scene has a visible placeholder until its file exists. Details are in [`media/README.md`](media/README.md).

| File | Scene | Notes |
|---|---|---|
| `media/ocean.mp4` | 02 | Full-bleed ocean, muted, loops. Placeholder: a pale blue gradient with a "not found" tag |
| `media/miss.png` | 10 | The RipVIS-129 contact sheet. Until then the scene uses `docs/clip-candidates/clip2_sneaky_1_RipVIS-129.jpg` |
| `media/thumbs/01.jpg` … `24.jpg` | 08 | 16:9 frame thumbnails. Missing files are skipped; with none, the scene draws placeholder frames |

## Design rules

- Colors are the app's tokens (`web/app/globals.css`): navy `#0a0f15`, teal `#4fb8ac` accent, white only in scenes 01-02. **Red means danger only**: the rip channel in 03, the rip and alert in 06, and the outlines in the scene 10 image.
- Fonts are the app's (Public Sans, IBM Plex Mono), embedded in `assets/fonts.css`.
- Motion is `power2.inOut`, `power3.out` or `sine.inOut`, 0.6-1.4 s. No bounce or overshoot. Strokes (logo, waves, arrows, brackets) write themselves on; text rises 24 px and fades in. With reduced motion on, each beat jumps to its end state.
- The logo is the same mark as `docs/assets/logo.svg`; `assets/stage.js` draws it from the same paths.

## Editing

- `assets/stage.js`: the beat engine and helpers (`Film.run`, `draw`, `rise`, `countUp`, `wave`, `logo`). A beat is a function that returns a finite GSAP timeline; endless loops (waves, pulses, the thumbnail stream) are standalone tweens created inside the beat, not part of the returned timeline.
- The team names on the closing card are one `TEAM` constant at the top of the script in `11-close.html`. The number of thumbnails is `THUMBS` in `08-build.html`.
- `build_tags.py` stamps the pinned GSAP script tag into files that contain a `<!--GSAP-->` marker. You only need it when adding a scene.
- Every on-screen number in these scenes comes from the repo (`ml/results/comparison.md`, `web/public/data/metrics.json`) or the video script's Sources list. Do not add statistics that are not there.
