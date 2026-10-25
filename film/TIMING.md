# Film timing

Measured from the real scenes (Chrome, `Film.state.tl.duration()` of each beat, played back to back; `film/assets/stage.js` is the same engine for all of them). A beat's time is how long its animation runs after you press the key. "Total" is the sum if every beat fires the moment the previous one ends, so it is the **minimum** length of the scene; the real recording is longer by whatever you wait between presses. Endless loops (waves, pulses, the thumbnail stream, the video in 02) are not counted. Re-measure after editing a scene.

All numbers are at normal speed. Open a scene with `?speed=N` to play it N times faster (a total of 12 s becomes 12 / N s of wall clock); the tables below do not change.

**Re-timed 2026-10-24:** 01 hook and 02 ocean were cut to hard targets (2.6 s and 4.0 s). Wall-clock check in Chrome at 1440x900, firing beat 2 the moment beat 1 ended: 01 = 1.03 s + 1.60 s, 2.63 s total, "?" in at 1.63 s; 02 = 1.01 s + 3.01 s, 4.02 s total, ocean 80% visible at 0.29 s, "Perhaps the ocean?" fully in at 0.71 s, navy fade done at 2.93 s, "But..." fully in at 3.46 s. (The extra ~0.03 s is the 10 ms polling and key-to-timeline latency.)

## Summary

| Scene | Beats | First beat (s) | Total (s) | Budget (s) | Status |
|---|---|---|---|---|---|
| 01 hook | 2 | 1.00 | 2.60 | 8 | within, 5.4 s spare |
| 02 ocean | 2 | 1.00 | 4.00 | 10 | within, 6.0 s spare |
| 03 definition | 9 | 1.80 | 14.65 | 24 | within, 9.3 s spare |
| 04 stakes | 4 | 2.70 | 12.05 | 20 | within, 7.9 s spare |
| 05 intro | 2 | 4.30 | 5.40 | 7 | within, 1.6 s spare |
| 06 concept | 3 | 2.60 | 10.06 | 12 | within, 1.9 s spare |
| 08 build | 3 | 1.20 | 6.40 | 15 | within, 8.6 s spare |
| 09 benchmarks | 4 | 1.10 | 7.60 | 17 | within, 9.4 s spare |
| 10 limits | 4 | 2.00 | 5.00 | 16 | within, 11.0 s spare |
| 11 close | 3 | 1.20 | 6.20 | 12 | within, 5.8 s spare |

**No scene's animation runs over its budget.** The budget is the whole scene, so the pauses between presses (narration, holds) come out of the spare time shown above. 03 definition, 04 stakes and 06 concept have the least relative room (14.7 of 24 s, 12.1 of 20 s and 10.1 of 12 s); if narration needs longer holds there, trim those first (for example 06 beat 3, 4.6 s, or 04's 3.25 s count-ups), or play them with `?speed=`.

## Per scene

### 01 hook (budget 8 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.00 |
| 2 | 1.60 |
| **Total** | **2.60** |

### 02 ocean (budget 10 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.00 |
| 2 | 3.00 |
| **Total** | **4.00** |

### 03 definition (budget 24 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.80 |
| 2 | 1.60 |
| 3 | 3.90 |
| 4 | 1.70 |
| 5 | 0.95 |
| 6 | 1.10 |
| 7 | 1.00 |
| 8 | 1.00 |
| 9 | 1.60 |
| **Total** | **14.65** |

### 04 stakes (budget 20 s)

| Beat | Duration (s) |
|---|---|
| 1 | 2.70 |
| 2 | 3.25 |
| 3 | 3.25 |
| 4 | 2.85 |
| **Total** | **12.05** |

### 05 intro (budget 7 s)

| Beat | Duration (s) |
|---|---|
| 1 | 4.30 |
| 2 | 1.10 |
| **Total** | **5.40** |

### 06 concept (budget 12 s)

| Beat | Duration (s) |
|---|---|
| 1 | 2.60 |
| 2 | 2.86 |
| 3 | 4.60 |
| **Total** | **10.06** |

### 08 build (budget 15 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.20 |
| 2 | 2.60 |
| 3 | 2.60 |
| **Total** | **6.40** |

### 09 benchmarks (budget 17 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.10 |
| 2 | 2.40 |
| 3 | 3.10 |
| 4 | 1.00 |
| **Total** | **7.60** |

### 10 limits (budget 16 s)

| Beat | Duration (s) |
|---|---|
| 1 | 2.00 |
| 2 | 1.00 |
| 3 | 1.00 |
| 4 | 1.00 |
| **Total** | **5.00** |

### 11 close (budget 12 s)

| Beat | Duration (s) |
|---|---|
| 1 | 1.20 |
| 2 | 1.20 |
| 3 | 3.80 |
| **Total** | **6.20** |
