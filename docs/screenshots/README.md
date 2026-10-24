# Screenshots (TODO)

The main README links these five images. Capture them on the recording laptop, which has all three demo clips, so the camera tiles show real footage instead of "Awaiting footage".

**How:** run `npm run build && npm start` in `web/`. Set the browser viewport to exactly 1920×1080 (full screen, or DevTools device toolbar), wait for the transitions to settle, take the screenshot, and save it as PNG with the exact file name below.

| File | Route | What to show |
|---|---|---|
| `dashboard.png` | `/` | CAM 01 (clip1) as the main feed with the rip outlined in red and the alert card showing, CAM 02 and CAM 03 in the strip, an event or two in the log |
| `compare.png` | `/compare` | CAM 02 (clip2, RipVIS-144): Gemini's boxes on the left, RipWatch's red mask on the right, mid-clip |
| `results.png` | `/results` | The full page with the real `metrics.json` (no PLACEHOLDER DATA badge) |
| `pipeline.png` | `/pipeline` | After the light has swept through at least once |
| `story.png` | `/story` | Card 1 (title) or card 2 (300,000), after the count-up has finished |

Keep the files under about 1 MB each (PNG at 1920×1080 is usually fine; re-save as JPG if one is much larger, and update the extension in the main README).
