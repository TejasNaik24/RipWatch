"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { ClipMeta } from "@/lib/clips";
import { IconAlert, IconCheck, IconClear } from "./Icons";

export interface LogEntry {
  id: number;
  at: string; // HH:MM:SS
  clipId: string;
  kind: "alert" | "clear" | "ack";
  text: string;
}

const ICON = {
  alert: <IconAlert size={16} className="text-rip" />,
  clear: <IconClear size={16} className="text-sea" />,
  ack: <IconCheck size={16} className="text-ink-2" />,
};

export default function EventLog({
  entries,
  clips,
  style,
}: {
  entries: LogEntry[];
  clips: ClipMeta[];
  style?: CSSProperties;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  // Show only the newest entries that fit completely: a row is never cut off at the bottom.
  // Messages wrap rather than truncate, so row heights vary and this is measured, not counted.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const fit = () => {
      const room = list.clientHeight;
      for (const li of Array.from(list.children) as HTMLElement[]) {
        li.style.visibility = li.offsetTop + li.offsetHeight <= room ? "" : "hidden";
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(list);
    return () => ro.disconnect();
  }, [entries]);

  return (
    <section style={style} className="rw-panel flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:min-h-48">
      <header className="flex shrink-0 items-baseline justify-between px-4 pb-1 pt-3">
        <h2 className="text-sm font-semibold">Event log</h2>
        <span className="text-xs text-ink-3">Newest first</span>
      </header>
      <ol ref={listRef} className="relative min-h-0 flex-1 overflow-hidden px-4 pb-2" aria-live="polite">
        {entries.length === 0 && (
          <li className="py-1.5 text-sm text-ink-3">No events yet. Watching {clips.length} cameras.</li>
        )}
        {entries.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[auto_16px_auto_minmax(0,1fr)] items-start gap-x-2 border-t border-line py-1.5 first:border-t-0"
          >
            <span className="whitespace-nowrap font-mono text-[13px] leading-5 text-ink-3">{e.at}</span>
            <span className="grid h-5 place-items-center">{ICON[e.kind]}</span>
            <span className="whitespace-nowrap font-mono text-[13px] leading-5 text-ink-2">
              {clips.find((c) => c.id === e.clipId)?.camera}
            </span>
            <span className={`text-[13px] leading-5 ${e.kind === "alert" ? "text-ink" : "text-ink-2"}`}>{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
