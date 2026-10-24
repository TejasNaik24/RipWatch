"use client";

import { useEffect, useState, type CSSProperties } from "react";
import LogoMark from "../LogoMark";
import { CARDS, type Card } from "./cards";
import CountUp from "./CountUp";

const LAST = CARDS.length - 1;
const OUT_MS = 420; // a little longer than the 350ms fade-out

interface Pos {
  index: number;
  prev: number | null;
  n: number; // bumps on every move, so layers remount and animate again
}

/** A beat: staggers a card's lines in. */
const after = (ms: number): CSSProperties => ({ ["--d" as string]: `${ms}ms` });

/** Three thin lines of water behind everything, drifting slowly. Calm on purpose. */
function Waterline() {
  const wave = (amp: number, y: number) => {
    // 4 periods of 600 units across 2400, so a shift of half the width loops seamlessly.
    let d = `M0 ${y}`;
    for (let i = 0; i < 4; i++) {
      const x = i * 600;
      d += ` C${x + 100} ${y - amp},${x + 200} ${y - amp},${x + 300} ${y} C${x + 400} ${y + amp},${x + 500} ${y + amp},${x + 600} ${y}`;
    }
    return d;
  };
  const lines = [
    { amp: 26, y: 40, o: 0.15, s: 52 },
    { amp: 18, y: 64, o: 0.21, s: 40 },
    { amp: 12, y: 88, o: 0.27, s: 31 },
  ];
  return (
    <div className="rw-story-water" aria-hidden>
      {lines.map((l, i) => (
        <svg key={i} viewBox="0 0 2400 128" preserveAspectRatio="none" style={{ animationDuration: `${l.s}s` }}>
          <path d={wave(l.amp, l.y)} fill="none" stroke="var(--sea)" strokeOpacity={l.o} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </div>
  );
}

function CardView({ card }: { card: Card }) {
  switch (card.kind) {
    case "title":
      return (
        <>
          <span className="rw-story-rise rw-story-mark" style={after(0)}>
            <LogoMark className="h-full w-full" />
          </span>
          <h1 className="rw-story-rise rw-story-title" style={after(120)}>
            {card.title}
          </h1>
          <p className="rw-story-rise rw-story-subline" style={after(700)}>
            {card.subline}
          </p>
        </>
      );
    case "stat":
      return (
        <>
          <p className="rw-story-rise rw-story-number" style={after(0)}>
            <CountUp spec={card.count} />
          </p>
          <p className="rw-story-rise rw-story-label" style={after(450)}>
            {card.label}
          </p>
          <p className="rw-story-rise rw-story-source" style={after(1100)}>
            {card.source}
          </p>
        </>
      );
    case "note":
      return (
        <>
          <p className="rw-story-rise rw-story-eyebrow" style={after(0)}>
            {card.eyebrow}
          </p>
          <h2 className="rw-story-rise rw-story-line" style={after(150)}>
            {card.headline}
          </h2>
          <p className="rw-story-rise rw-story-subline" style={after(900)}>
            {card.subline}
          </p>
          <p className="rw-story-rise rw-story-source" style={after(1500)}>
            {card.source}
          </p>
        </>
      );
    case "bridge":
      return (
        <>
          <p className="rw-story-rise rw-story-line" style={after(0)}>
            {card.lead}
          </p>
          <p className="rw-story-rise rw-story-line" style={after(1500)}>
            {card.before}
            <span className="text-rip">{card.danger}</span>
            {card.after}
          </p>
        </>
      );
    case "closing":
      return (
        <>
          <p className="rw-story-rise rw-story-line rw-story-dim" style={after(0)}>
            {card.lead}
          </p>
          <p className="rw-story-rise rw-story-line" style={after(1500)}>
            {card.turn}
          </p>
          <div className="rw-story-rise rw-story-credit" style={after(2800)}>
            <p className="rw-story-credit-main">{card.credit}</p>
            <p className="rw-story-credit-team">{card.team}</p>
          </div>
        </>
      );
  }
}

/**
 * Full-screen, keyboard-driven sequence for recording the video's opening and close.
 * Right arrow or Space: next. Left arrow: back. R: restart. No chrome, nothing on screen
 * except the card. It sits above the app's top bar, so that bar never shows in the frame.
 */
export default function StoryStage() {
  const [pos, setPos] = useState<Pos>({ index: 0, prev: null, n: 0 });

  useEffect(() => {
    const move = (to: (i: number) => number) =>
      setPos((s) => {
        const next = Math.min(Math.max(to(s.index), 0), LAST);
        return next === s.index ? s : { index: next, prev: s.index, n: s.n + 1 };
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        move((i) => i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        move((i) => i - 1);
      } else if (e.key === "r" || e.key === "R") {
        move(() => 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The card that was showing fades out for a moment, then its layer is removed.
  useEffect(() => {
    if (pos.prev === null) return;
    const id = setTimeout(() => setPos((s) => (s.n === pos.n ? { ...s, prev: null } : s)), OUT_MS);
    return () => clearTimeout(id);
  }, [pos.n, pos.prev]);

  return (
    <main
      className="rw-story"
      aria-label="RipWatch story"
      // Phones and portrait tablets have no keyboard: tap the left third to go back, anywhere else for next.
      // Wider screens keep the keyboard-only behavior, so clicking never moves the sequence there.
      onClick={(e) => {
        if (!window.matchMedia("(width < 64rem)").matches) return;
        const back = e.clientX < window.innerWidth / 3;
        setPos((s) => {
          const next = Math.min(Math.max(s.index + (back ? -1 : 1), 0), LAST);
          return next === s.index ? s : { index: next, prev: s.index, n: s.n + 1 };
        });
      }}
    >
      <Waterline />
      {pos.prev !== null && (
        <div key={`out-${pos.n}`} className="rw-story-layer rw-story-out" aria-hidden>
          <CardView card={CARDS[pos.prev]} />
        </div>
      )}
      <div key={`in-${pos.n}`} className="rw-story-layer" aria-live="polite">
        <CardView card={CARDS[pos.index]} />
      </div>
    </main>
  );
}
