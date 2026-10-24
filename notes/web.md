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
