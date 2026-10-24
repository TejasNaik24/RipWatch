# RipWatch

Rip current detection for beach video. A fine-tuned YOLO11-seg model finds rip currents and the web app paints them red.

Built for a 24-hour hackathon. The demo is a pre-recorded video, so the site is fully static: the ML side runs the model offline and drops output files into `web/public/data/`, and the web app plays the clips and draws the masks on a canvas from JSON.

| Folder | Owner | What |
|---|---|---|
| `ml/` | ML teammate | Training, inference, export of masks and metrics |
| `web/` | Web teammate | Next.js (App Router, TypeScript, Tailwind) player |
| `notes/` | Both | `contract.md` (data format), `ml.md` and `web.md` (logs) |

Data format: see [notes/contract.md](notes/contract.md). Working rules: see [CLAUDE.md](CLAUDE.md).

## Run the web app

```bash
cd web
npm install
npm run dev
```
