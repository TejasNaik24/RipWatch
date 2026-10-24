"use client";

import { useEffect, useState } from "react";
import type { CountSpec } from "./cards";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const fmt = (n: number, group?: boolean) => (group ? n.toLocaleString("en-US") : String(n));

/**
 * Counts from `from` to `to` once, when it mounts (a card remounts each time it is shown).
 * Reduced motion shows the final value straight away.
 */
export default function CountUp({
  spec,
  duration = 1400,
  delay = 300,
}: {
  spec: CountSpec;
  duration?: number;
  delay?: number;
}) {
  const { pre = "", post = "", from, to, group } = spec;
  const [n, setN] = useState(from);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setN(to), 0);
      return () => clearTimeout(id);
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      setN(Math.round(from + (to - from) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration, delay]);

  const final = fmt(to, group);
  return (
    <span aria-label={`${pre}${final}${post}`}>
      <span aria-hidden>
        {pre}
        {/* The slot is sized by the final value (hidden), and the live value sits at its right
            edge, so nothing shifts while it counts. Digits are tabular. */}
        <span className="inline-grid">
          <span className="invisible [grid-area:1/1]">{final}</span>
          <span className="justify-self-end [grid-area:1/1]">{fmt(n, group)}</span>
        </span>
        {post}
      </span>
    </span>
  );
}
