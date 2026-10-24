# film/media

Drop the media the scenes expect here. Nothing in this folder is required for a scene to run: each scene has a visible placeholder or a fallback until its file arrives.

| File | Used by | What to add |
|---|---|---|
| `ocean.mp4` | `02-ocean.html` | A full-bleed ocean video. 1920×1080 or larger, H.264, no audio needed (it plays muted and loops). Keep the file small enough to scrub (about 20-60 MB) |
| `miss.png` | `10-limits.html` | The RipVIS-129 contact sheet. Wide images work best (the slot is 1700 px wide, at most 420 px tall). Until it exists, the scene uses `docs/clip-candidates/clip2_sneaky_1_RipVIS-129.jpg` with its header line cropped off |
| `thumbs/01.jpg` … `thumbs/24.jpg` | `08-build.html` | Video-frame thumbnails for the stream. 16:9, at least 400×225. Any number from 1 to 24 works: files that are missing are skipped, and if there are none the scene draws placeholder frames |

`ocean.mp4`, `miss.png` and `thumbs/` are git-ignored (see `film/.gitignore`): a large video should not be committed by accident, and RipVIS frames are CC BY-NC 4.0 and not for redistribution. Keep these files local and copy them to the recording machine.
