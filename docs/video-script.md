# RipWatch: 3:00 video script (draft)

Rule for this draft: every statistic, metric and factual claim that has not been verified is written as `[TODO: verified number]`. Fill each one from a source we can cite, or cut the sentence. Nothing unverified goes in the video.

Record at 1920x1080. Run the app with `npm run dev` in `web/`. Real clips and masks must be in `web/public/data/` first; until then the screens show placeholder data.

| Time | Section | Screen |
|---|---|---|
| 0:00-0:20 | Hook | `/hook` |
| 0:20-0:45 | Problem | Footage plus text cards |
| 0:45-1:40 | Demo | `/`, `/compare`, `/` |
| 1:40-2:15 | How it works | `/pipeline`, `/results` |
| 2:15-2:45 | Responsible AI and limits | `/results` (Limits), failure clip |
| 2:45-3:00 | Close | `/hook` |

---

## 0:00-0:20 Hook

**Screen:** `/hook`, full screen, no chrome. Start on a beach clip with the mask hidden. Press `M` at the end of the question to fade the mask in. Use the key shown in the on-screen controls to pick the clip (`1`-`3`).

**Narration:**
> Where would you swim?
>
> *(Beat. Let the viewer look at the water. Press M.)*
>
> That smooth-looking patch is a rip current. [TODO: verified number: how often beachgoers pick the rip, or cut this clause and keep only the reveal]

**Notes:** Hold two full seconds of silence on the question. The mask fade takes about 1.2 seconds. Do not narrate over the fade.

---

## 0:20-0:45 Problem

**Screen:** Open beach footage (the same clip, mask hidden). Add three text cards, one per beat: the drowning figure, the "invisible" line, the Lake Erie line. Keep sources on screen.

**Narration:**
> Rip currents cause [TODO: verified number: annual rip current drownings or rescues, with source].
>
> And [TODO: verified number: share of beachgoers who cannot identify a rip current, with source] cannot see them. They look like the safest water on the beach.
>
> This is not only an ocean problem. On Lake Erie, [TODO: verified number: Lake Erie rip current incident or fatality count, with source].
>
> Lifeguards cannot watch every stretch of water at every moment.

**Notes:** If we cannot source a line, cut that line and keep the rest. Do not say "thousands" or "most" without a number behind it.

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
> It was trained on RipVIS, an open dataset of rip current video. [TODO: verified number: RipVIS video count and countries, from the dataset paper or card]
>
> *(Results.)* We measure it the way a lifeguard would care about. Missing a rip is worse than a false alarm, so we report F2, which weights recall above precision. On held-out video, RipWatch scores [TODO: verified number: RipWatch F2], against [TODO: verified number: baseline F2] for the baseline. Precision [TODO: verified number], recall [TODO: verified number], over [TODO: verified number: held-out frame count] frames.

**Notes:**
- The `/pipeline` page currently shows "184 expert-annotated videos, 10 countries". The dataset card confirms 184 videos, 150 of them with annotated rips. It does not state the country count or "expert-annotated". Verify against the RipVIS paper or fix the page before recording.
- `/results` shows a PLACEHOLDER DATA badge while `metrics.json` has `"fake": true`. Do not record it until the badge is gone.
- Metrics must come from the official `compute_pr_f1_f2.py` run on the held-out split, not from our own re-implementation.

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

**Screen:** `/hook` again, clip with the mask faded in over the rip. Hold on the final frame. Optionally end on the RipWatch wordmark.

**Narration:**
> Rip currents are invisible.
>
> Now they don't have to be.

**Notes:** Nothing after the last word. Leave one beat of silence, then cut.

---

## Open TODOs before recording

- [ ] Real clips (`clip1_obvious`, `clip2_sneaky`, `clip3_norip`) and real masks in `web/public/data/`
- [ ] Drowning and rescue figure with source (Problem)
- [ ] Share of people who cannot identify a rip, with source (Problem)
- [ ] Lake Erie figure with source (Problem)
- [ ] What the baseline does on the sneaky clip (Demo)
- [ ] RipVIS video count and country count, checked against the paper (How it works, `/pipeline`)
- [ ] F2, precision, recall, held-out frame count from `compute_pr_f1_f2.py` (How it works)
- [ ] A real failure case clip (Responsible AI)
- [ ] Flash rip claim sourced or cut (Responsible AI)
- [ ] Non-commercial license wording re-checked (Responsible AI)
