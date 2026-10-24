import type { CSSProperties } from "react";
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
  return (
    <section style={style} className="rw-panel flex min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-baseline justify-between px-5 pb-1.5 pt-4">
        <h2 className="text-sm font-semibold">Event log</h2>
        <span className="text-xs text-ink-3">Newest first</span>
      </header>
      <ol className="min-h-0 flex-1 overflow-hidden px-5 pb-3" aria-live="polite">
        {entries.length === 0 && (
          <li className="py-2 text-sm text-ink-3">No events yet. Watching {clips.length} cameras.</li>
        )}
        {entries.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[64px_16px_52px_1fr] items-center gap-2.5 border-t border-line py-[7px] first:border-t-0"
          >
            <span className="font-mono text-[13px] text-ink-3">{e.at}</span>
            {ICON[e.kind]}
            <span className="font-mono text-[13px] text-ink-2">
              {clips.find((c) => c.id === e.clipId)?.camera}
            </span>
            <span className={`truncate text-sm ${e.kind === "alert" ? "text-ink" : "text-ink-2"}`}>{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
