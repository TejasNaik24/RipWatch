# RipWatch: 3:00 video script (draft)

Rule for this draft: every statistic, metric and factual claim that has not been verified is written as `[TODO: verified number]`. Fill each one from a source we can cite, or cut the sentence. Nothing unverified goes in the video.

Record at 1920x1080. Run the app with `npm run dev` in `web/`. Real clips and masks must be in `web/public/data/` first; until then the screens show placeholder data.

| Time | Section | Screen |
|---|---|---|
| 0:00-0:20 | Hook | `/hook` |
| 0:20-0:45 | Problem | `/story` stat cards (keys below) |
| 0:45-1:40 | Demo | `/`, `/compare`, `/` |
| 1:40-2:15 | How it works | `/pipeline`, `/results` |
| 2:15-2:45 | Responsible AI and limits | `/results` (Limits), failure clip |
| 2:45-3:00 | Close | `/story` closing card (or `/hook`) |

---

## Story cards (`/story`)

A full-screen, keyboard-driven sequence for recording the opening and close. It is not linked in the nav, has no on-screen controls, and covers the app's top bar, so only the card is in frame. Record at 1920x1080 (it also fits 1512x982 and 1440x900).

**Keys:** `Right Arrow` or `Space` next card, `Left Arrow` back, `R` restart at the title card. It stops at the first and last card. Presses never block, so quick taps work; give each card its beat before moving on (numbers count up for about 1.5 s, second lines appear after about 1.5 s).

| # | Card | Used in |
|---|---|---|
| 1 | Title: "RipWatch", "Seeing the danger swimmers can't." | Opening, optional, before the hook |
| 2 | 300,000 estimated drowning deaths worldwide in 2021 (World Health Organization) | Problem, beat 1 |
| 3 | 80%+ of rescues by US surf beach lifeguards involve rip currents (United States Lifesaving Association) | Problem, beat 2 |
| 4 | 1 in 5 beachgoers could spot a real rip current in person (Muriwai Beach field study, *Natural Hazards and Earth System Sciences*, 2021) | Problem, beat 3 |
| 5 | At least 17 drownings in Lake Erie in 2025 (according to the Great Lakes Surf Rescue Project) | Problem, beat 4 |
| 6 | Bridge: "Rip currents look calm. That's what makes them deadly." | End of Problem |
| 7 | Closing: "Rip currents are invisible. Now they don't have to be." + "RipWatch · HackOHI/O 2026" + team names | Close |

**Notes:**
- Only the four statistics above appear on the cards, with the sources listed under Sources. Say the same numbers in the voice-over. Card 4 says "1 in 5": **say "about 1 in 5"** (the study's figure is 22%).
- Card 3 is "surf beach lifeguards", not all lifeguards. The USLA-based figure rests on voluntary lifeguard-agency reporting.
- Card 5 reads "At least 17" (the number counts up to 17). It is an advocacy group's count; keep "according to the Great Lakes Surf Rescue Project" in the voice-over. Re-check the 17 on their tracker before recording (the full-year 2025 total could not be confirmed from news coverage alone).
- Card 2 says "300,000" with the label "estimated drowning deaths", matching WHO's own "estimated 300,000" for 2021. Say "an estimated 300,000" in the voice-over.
- Card 7 shows the placeholder `[Teammate name]` until `TEAMMATE_NAME` in `web/components/story/cards.ts` is filled in.
- The word "deadly" on card 6 is the one red element (`.text-rip` in `StoryStage.tsx`).

---

## 0:00-0:20 Hook

**Screen:** `/hook`, full screen, no chrome. Start on a beach clip with the mask hidden. Press `M` at the end of the question to fade the mask in. Use the key shown in the on-screen controls to pick the clip (`1`-`3`).

**Narration:**
> Where would you swim?
>
> *(Beat. Let the viewer look at the water. Press M.)*
>
> That smooth-looking patch is a rip current. Only about 1 in 5 beachgoers could spot a rip in person.

**Notes:** "1 in 5" is the Muriwai Beach field study (22%, Sources 3). Hold two full seconds of silence on the question. The mask fade takes about 1.2 seconds. Do not narrate over the fade.

---

## 0:20-0:45 Problem

**Screen:** `/story`, one card per beat (see Story cards below). Press `Right Arrow` or `Space` once per beat: the drowning figure, the rip current rescue figure, the "1 in 5" line, the Lake Erie line. Each card shows its short source under the number. Optionally cut to beach footage between cards.

**Narration:**
> Drowning killed an estimated 300,000 people worldwide in 2021.
>
> In the United States, rip currents cause an estimated 100 or more deaths a year, and more than 80% of rescues by surf beach lifeguards.
>
> And they are hard to see. In a field study at a New Zealand beach, only 22% of beachgoers could pick out a real rip current. They look like the safest water on the beach.
>
> This is not only an ocean problem. Lake Erie saw at least 17 drownings in 2025, according to the Great Lakes Surf Rescue Project.
>
> Lifeguards cannot watch every stretch of water at every moment.

**Notes:**
- Voice-over for the third card: say "about 1 in 5 beachgoers could spot a real rip" (the card says "1 in 5"; the study's exact figure is 22%).
- The WHO figure is all drowning, not only rip currents. Do not say rip currents killed 300,000.
- The Lake Erie figure is all drownings counted by an advocacy group, not an official or rip-only count. Keep the "according to" attribution on screen and in the voice-over.
- Card sources: WHO 2024; USLA; NHESS 2021; Great Lakes Surf Rescue Project.
- Do not add any statistic that is not in Sources.

---

## 0:45-1:40 Demo

**Screen:** Three recordings, in this order.

1. **0:45-1:05, `/` (Command).** Camera with a rip is focused on the dashboard. The status pill flips from CLEAR to RIP DETECTED, the alert card slides in, and the event log gets a line. Raise the threshold slider briefly to show it is adjustable, then put it back to the default.
2. **1:05-1:25, `/compare`.** Pick the sneaky clip (`clip2_sneaky`). Baseline on the left, RipWatch on the right, same clock. Let it play so the viewer sees the baseline miss or box loosely while RipWatch outlines the rip.
3. **1:25-1:40, `/`.** Focus the no-rip camera (`clip3_norip`). The pill stays CLEAR for the whole shot. Do not cut away early.

**Narration:**
> This is the RipWatch command view. Each camera reports a status in real time. *(Pill flips.)* When a rip appears, the lifeguard gets an alert with a confidence score, and the event is logged.
>
> *(Switch to compare.)* Here is the hard case, a rip that is easy to miss. On the left, a baseline model. On the right, RipWatch, fine-tuned on rip current video. Same footage, same moment. The baseline [TODO: describe what the baseline actually does on this clip once the real masks exist]. RipWatch outlines the rip.
>
> *(Switch to no-rip clip.)* Just as important: when there is no rip, it stays quiet. No false alarm, no crying wolf. A system lifeguards stop trusting is a system they turn off.

**Notes:** Do not narrate the baseline behaviour until we have watched the real masks. The line in brackets is a placeholder, not a claim.

---

## 1:40-2:15 How it works

**Screen:** `/pipeline` (about 15 s, let the sweep run once through), then `/results` (about 20 s).

**Narration:**
> *(Pipeline.)* A beach camera feeds video into RipWatch. The video is split into frames. A YOLO11 segmentation model, fine-tuned for rip currents, outlines the rip on each frame. Temporal smoothing keeps the result steady across frames, so the alert does not flicker. Then a lifeguard is alerted.
>
> It was trained on RipVIS, an open dataset of rip current video: 184 videos, 212,328 frames, filmed in 10 countries.
>
> *(Results.)* We measure it the way a lifeguard would care about. Missing a rip is worse than a false alarm, so we report F2, which weights recall above precision. Out of 150 held-out frames with a rip current, Gemini 3.5 Flash Lite flagged 39. RipWatch flagged 108. Both had about 95% precision, so the difference is recall: 0.26 against 0.72. Image-level F2: 0.30 against 0.76. *(Optional, once, in passing:)* On the stricter test of drawing the box in the right place, F2 is 0.02 against 0.51.

**Notes:**
- RipVIS figures (184 videos, 212,328 frames, 10 countries) are from the RipVIS paper (CVPR 2025), see Sources. Check that the `/pipeline` dataset line matches them before recording.
- `/results` shows a PLACEHOLDER DATA badge while `metrics.json` has `"fake": true`. Do not record it until the badge is gone.
- Final numbers come from our `ml/scripts/eval_compare.py` (one scoring function for RipWatch and the Gemini 3.5 Flash Lite baseline on the same 200 held-out frames, written to `web/public/data/metrics.json`), matching the README.

---

## 2:15-2:45 Responsible AI and limits

**Screen:** `/results` Limits panel (fill it with the real limits first), then a recording of the failure case (a clip where RipWatch misses or misfires), then the dashboard alert card.

**Narration:**
> RipWatch is advisory only. It points a lifeguard's attention. It does not close a beach, and it is not a replacement for trained judgment.
>
> It also fails. *(Show failure clip.)* Here, [TODO: describe the real failure case and why it happens, from an actual clip]. We show it because you should know where not to trust it.
>
> It does not detect flash rips, which appear and disappear too quickly for this approach. [TODO: verified number or source on flash rip duration, or cut the clause]
>
> And the dataset it learned from, RipVIS, is licensed for non-commercial use. This is a research demo, not a product.

**Notes:**
- The RipVIS dataset card states a CC BY-NC 4.0 license with additional non-commercial conditions. Re-read the exact terms before wording the last line.
- Pick the failure clip from real model output. Do not stage one.

---

## 2:45-3:00 Close

**Screen:** `/story` closing card (card 7: "Rip currents are invisible. Now they don't have to be.", then "RipWatch · HackOHI/O 2026" and the team names). Open `/story`, press `Right Arrow` six times (or `R` then six times) to reach it, and start recording when it appears. Alternative: `/hook` again with the mask faded in over the rip, ending on the RipWatch wordmark.

**Narration:**
> Rip currents are invisible.
>
> Now they don't have to be.

**Notes:** Nothing after the last word. Leave one beat of silence, then cut.

---

## Open TODOs before recording

- [ ] Real clips (`clip1_obvious`, `clip2_sneaky`, `clip3_norip`) and real masks in `web/public/data/`
- [x] Drowning and rescue figures with source (Problem)
- [x] Share of people who cannot identify a rip, with source (Problem)
- [x] Lake Erie figure with source (Problem)
- [ ] What the baseline does on the sneaky clip (Demo)
- [x] RipVIS video, frame and country count, from the paper (How it works); `/pipeline` text still to be checked against it
- [x] F2, precision, recall, held-out frame count from `ml/scripts/eval_compare.py` (How it works): filled with the image-level headline from `ml/results/comparison.md` (box level mentioned once at most)
- [ ] A real failure case clip (Responsible AI)
- [ ] Flash rip claim sourced or cut (Responsible AI)
- [ ] Non-commercial license wording re-checked (Responsible AI)

---

## Sources

Only these statistics may appear in the video. Add the link for each before recording if it is not here.

1. World Health Organization, *Global Status Report on Drowning Prevention* (December 2024): an estimated 300,000 drowning deaths worldwide in 2021.
2. United States Lifesaving Association, Rip Currents, usla.org/page/ripcurrents: rip currents cause an estimated 100+ deaths a year in the US and more than 80% of rescues by surf beach lifeguards.
3. Field study at Muriwai Beach, New Zealand, *Natural Hazards and Earth System Sciences* (2021): only 22% of beachgoers could identify a real rip current in person.
4. Great Lakes Surf Rescue Project: at least 17 drownings in Lake Erie in 2025. An advocacy group's count; always attribute it ("according to the Great Lakes Surf Rescue Project").
5. RipVIS dataset paper (CVPR 2025): 184 videos, 212,328 frames, footage from 10 countries.
