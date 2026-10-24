/*
 * Shared runtime for the film scenes (GSAP 3 must be loaded first).
 *
 *   Film.run({ setup, beats: [() => timeline, ...] })
 *
 * Space or Right Arrow: play the next beat. If a beat is still playing, the press finishes it
 * instead (so nothing double-plays); the next press starts the next beat. R: back to the start.
 * Held keys are ignored. `?skip=N` in the URL starts with the first N beats already played.
 * Film.hold(promise) (before Film.run) keeps the first press from starting until media has loaded.
 * Recording aids (no on-screen UI): P pauses or resumes everything that is animating (GSAP's global
 * timeline, so beat timelines and endless loops alike). B steps back one beat: the page reloads with
 * the beats before the previous one already played (`?skip=i-1&auto=1`) and replays the previous beat
 * from its start; from the first beat it goes back to the empty first frame.
 *
 * Rules for scenes: a beat returns a finite GSAP timeline. Endless loops (waves, pulses, streams)
 * are standalone tweens, created inside the beat function but NOT added to the returned timeline.
 */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("stage");

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${-960 * s}px, ${-540 * s}px) scale(${s})`;
  }
  addEventListener("resize", fit);
  fit();

  if (!window.gsap) {
    stage.insertAdjacentHTML(
      "beforeend",
      '<p style="position:absolute;left:60px;bottom:60px;font:28px monospace;color:#c0392b">GSAP did not load (needs internet access to cdnjs.cloudflare.com).</p>'
    );
    return;
  }
  gsap.defaults({ ease: "power2.inOut", duration: 1 });

  const Film = (window.Film = {});

  // ------------------------------------------------------------------ loading gate
  // Film.hold(promise), called before Film.run: Space / Right Arrow (and the ?auto=1 replay) are ignored
  // until every held promise has settled. Scenes use it to wait for their media.
  let holds = 0;
  let autoWaiting = false;
  Film.hold = function (p) {
    holds += 1;
    Promise.resolve(p).catch(() => {}).then(() => {
      holds -= 1;
      if (!holds && autoWaiting) {
        autoWaiting = false;
        Film.next();
      }
    });
  };

  // ------------------------------------------------------------------ beat engine
  Film.run = function ({ setup, beats }) {
    if (setup) setup();
    const state = (Film.state = { i: -1, tl: null, total: beats.length });

    function play(i) {
      const tl = beats[i]();
      state.tl = tl || null;
      if (reduce && tl) tl.progress(1, false);
    }
    function next() {
      if (holds) return;
      if (gsap.globalTimeline.paused()) gsap.globalTimeline.resume();
      // Finish a beat that is still playing before starting the next one.
      if (state.tl && state.tl.progress() < 1) {
        state.tl.progress(1, false);
        return;
      }
      if (state.i + 1 >= beats.length) return;
      state.i += 1;
      play(state.i);
    }
    Film.next = next;

    addEventListener("keydown", (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "r" || e.key === "R") {
        location.href = location.pathname;
      } else if (e.key === "p" || e.key === "P") {
        gsap.globalTimeline.paused(!gsap.globalTimeline.paused());
      } else if (e.key === "b" || e.key === "B") {
        // Replay the previous beat: i is the beat that last started, so the previous one is i - 1.
        location.href = state.i >= 1 ? `${location.pathname}?skip=${state.i - 1}&auto=1` : location.pathname;
      }
    });

    const skip = parseInt(new URLSearchParams(location.search).get("skip") || "0", 10);
    for (let k = 0; k < Math.min(skip, beats.length); k++) {
      state.i += 1;
      play(state.i);
      if (state.tl) state.tl.progress(1, false);
    }
    if (new URLSearchParams(location.search).get("auto") === "1") {
      if (holds) autoWaiting = true;
      else next();
    }
  };

  // ------------------------------------------------------------------ helpers
  /** Hide SVG strokes so draw() can write them on. */
  Film.prep = function (targets) {
    (Array.isArray(targets) ? targets : [targets]).flatMap((t) => gsap.utils.toArray(t)).forEach((el) => {
      const len = el.getTotalLength();
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      el.style.opacity = 0; // a zero-length dash with round caps would otherwise show as a dot
    });
  };
  /** Write a prepped stroke on. Returns a timeline. */
  Film.draw = function (el, dur = 1.1, vars = {}) {
    return gsap
      .timeline()
      .set(el, { opacity: 1 })
      .to(el, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut", ...vars });
  };
  /** Rises from `dy` px below (default 24) to its place while fading in. Other options go to GSAP. */
  Film.rise = function (el, { dy = 24, ...vars } = {}) {
    return gsap.fromTo(
      el,
      { opacity: 0, y: dy },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", ...vars }
    );
  };
  /** Count from `from` to `to`; the number sits in a slot as wide as the final value, so nothing shifts. */
  Film.countUp = function (el, { pre = "", from = 0, to, post = "", group = false, dur = 1.5, ease = "power2.out" }) {
    const fmt = (n) => (group ? n.toLocaleString("en-US") : String(n));
    const slot = document.createElement("span");
    slot.className = "slot";
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    ghost.textContent = fmt(to);
    const liveEl = document.createElement("span");
    liveEl.className = "live";
    liveEl.textContent = fmt(from);
    slot.append(ghost, liveEl);
    el.replaceChildren(document.createTextNode(pre), slot, document.createTextNode(post));
    const live = liveEl;
    const o = { v: from };
    return gsap.to(o, { v: to, duration: dur, ease, onUpdate: () => (live.textContent = fmt(Math.round(o.v))) });
  };
  /** A wavy path across [x0, x1] at height y. */
  Film.wave = function (x0, x1, y, amp = 8, period = 160) {
    const n = Math.max(1, Math.round((x1 - x0) / period));
    const p = (x1 - x0) / n;
    const q = p / 6;
    let d = `M${x0} ${y}`;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * p;
      d += ` C${x + q} ${y - amp},${x + 2 * q} ${y - amp},${x + 3 * q} ${y} C${x + 4 * q} ${y + amp},${x + 5 * q} ${y + amp},${x + p} ${y}`;
    }
    return d;
  };
  /** The RipWatch mark (same paths as docs/assets/logo.svg), with parts addressable for drawing. */
  Film.logo = function (size) {
    return (
      `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 32 32" role="img" aria-label="RipWatch">` +
      '<rect class="lg-fill" width="32" height="32" rx="8" fill="#10161f"/>' +
      '<rect class="lg-frame stroke" x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="#4fb8ac" stroke-opacity="0.55" stroke-width="1.5"/>' +
      '<g class="stroke" stroke="#4fb8ac" stroke-width="2.5">' +
      '<path class="lg-w lg-w1" d="M5 25c2.4 0 3.2-1.6 5.5-1.6 1.4 0 2.2.6 3.1 1.1"/>' +
      '<path class="lg-w lg-w2" d="M27 25c-2.4 0-3.2-1.6-5.5-1.6-1.4 0-2.2.6-3.1 1.1"/>' +
      '<path class="lg-w lg-w3" d="M5 18.5c2.6 0 4.2-1.2 6-2.4 1.6-1.1 3-3 5-5.6 2 2.6 3.4 4.5 5 5.6 1.8 1.2 3.4 2.4 6 2.4"/>' +
      "</g></svg>"
    );
  };
  /** Draw the logo on: frame, fill, then the waves. Returns a timeline. */
  Film.drawLogo = function (root) {
    const frame = root.querySelector(".lg-frame");
    const fill = root.querySelector(".lg-fill");
    const waves = root.querySelectorAll(".lg-w");
    Film.prep([frame, ...waves]);
    gsap.set(fill, { opacity: 0 });
    const tl = gsap.timeline();
    tl.add(Film.draw(frame, 1.1));
    tl.to(fill, { opacity: 1, duration: 0.6 }, "-=0.3");
    waves.forEach((w, i) => tl.add(Film.draw(w, 0.9), i === 0 ? "-=0.2" : "-=0.55"));
    return tl;
  };
})();
