"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatStamp(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatTime(d)}`;
}

export function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "mm:ss", or "h:mm:ss" past an hour. */
export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// Rendered after mount only, so server and client markup never disagree.
export default function LiveClock({ className = "", timeOnly = false }: { className?: string; timeOnly?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const width = timeOnly ? 8 : 19;
  return (
    <time className={`font-mono tabular-nums ${className}`}>
      {now ? (timeOnly ? formatTime(now) : formatStamp(now)) : " ".repeat(width)}
    </time>
  );
}

/** Time since `since` (epoch ms), ticking every second. Blank until mounted. */
export function Elapsed({ since, className = "" }: { since: number | null; className?: string }) {
  const [text, setText] = useState("--:--");
  useEffect(() => {
    if (since == null) return;
    const tick = () => setText(formatDuration(Date.now() - since));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [since]);
  return <span className={`font-mono tabular-nums ${className}`}>{since == null ? "--:--" : text}</span>;
}
