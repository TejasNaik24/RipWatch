"use client";

import { useCallback, useEffect, useState } from "react";
import { CLIPS, DEFAULT_THRESHOLD, type ClipMeta } from "@/lib/clips";
import { useRipStatus, type RipStatus } from "@/lib/useRipStatus";
import AlertCard from "./AlertCard";
import LiveClock, { formatStamp } from "./LiveClock";
import MaskedVideo from "./MaskedVideo";
import StatusPill from "./StatusPill";
import ThresholdControl from "./ThresholdControl";

interface LogEntry {
  at: string;
  clipId: string;
  text: string;
}

function Feed({
  clip,
  threshold,
  onSelect,
  onStatus,
}: {
  clip: ClipMeta;
  threshold: number;
  onSelect: () => void;
  onStatus: (clipId: string, s: RipStatus, prev: RipStatus) => void;
}) {
  const [status, onFrame] = useRipStatus((s, prev) => onStatus(clip.id, s, prev));
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-panel text-left transition-colors ${
        status.active ? "border-alert/70" : "border-line hover:border-mute/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rw-blink h-2 w-2 shrink-0 rounded-full bg-alert" />
            <span className="font-mono text-sm font-semibold tracking-wider">{clip.camera}</span>
            <span className="truncate text-sm text-mute">{clip.location}</span>
          </div>
          <LiveClock className="mt-1 block text-xs text-mute" />
        </div>
        <StatusPill active={status.active} />
      </div>
      <MaskedVideo
        clipId={clip.id}
        source="ripwatch"
        threshold={threshold}
        onFrame={onFrame}
        className="aspect-video w-full"
      />
    </button>
  );
}

export default function Dashboard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [statuses, setStatuses] = useState<Record<string, RipStatus>>({});
  const [log, setLog] = useState<LogEntry[]>([]);

  const onStatus = useCallback((clipId: string, s: RipStatus, prev: RipStatus) => {
    setStatuses((m) => ({ ...m, [clipId]: s }));
    if (s.active !== prev.active) {
      setLog((l) =>
        [
          {
            at: formatStamp(new Date()),
            clipId,
            text: s.active ? `Rip current detected (${Math.round(s.conf * 100)}%)` : "Area clear",
          },
          ...l,
        ].slice(0, 6),
      );
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = CLIPS.find((c) => c.id === activeId) ?? null;
  const activeStatus = active ? statuses[active.id] : undefined;
  const alerting = !!activeStatus?.active;
  const detectedCount = CLIPS.filter((c) => statuses[c.id]?.active).length;
  const rail = CLIPS.filter((c) => c.id !== activeId);

  return (
    <main className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex h-9 items-center justify-between">
        <div className="flex items-center gap-4">
          {active ? (
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="rounded-md border border-line px-3 py-1.5 font-mono text-xs tracking-wider text-mute hover:text-ink"
            >
              ← ALL CAMERAS
            </button>
          ) : (
            <h1 className="text-xl font-semibold tracking-wide">Beach Camera Network</h1>
          )}
          {active && (
            <span className="text-xl font-semibold">
              {active.camera} · {active.location}
            </span>
          )}
        </div>
        <ThresholdControl value={threshold} onChange={setThreshold} />
      </div>

      <div
        className={
          active
            ? "grid grid-cols-[1fr_520px] content-start items-start gap-6"
            : "grid grid-cols-3 gap-6"
        }
      >
        {active && (
          <div className="col-start-2 row-start-1">
            <AlertCard show={alerting} clip={active} conf={activeStatus?.conf ?? 0} />
          </div>
        )}
        {CLIPS.map((clip) => {
          const isActive = clip.id === activeId;
          const railIdx = rail.findIndex((c) => c.id === clip.id);
          const place = !active
            ? ""
            : isActive
              ? "col-start-1 row-start-1 row-span-3"
              : railIdx === 0
                ? "col-start-2 row-start-2"
                : "col-start-2 row-start-3";
          return (
            <div key={clip.id} className={`min-w-0 ${active ? "self-start" : ""} ${place}`}>
              <Feed
                clip={clip}
                threshold={threshold}
                onSelect={() => setActiveId(isActive ? null : clip.id)}
                onStatus={onStatus}
              />
            </div>
          );
        })}
      </div>

      {!active && (
        <section className="grid flex-1 grid-cols-[360px_1fr] gap-6">
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="font-mono text-xs tracking-[0.2em] text-mute">NETWORK STATUS</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-4xl font-semibold">{CLIPS.length}</div>
                <div className="mt-1 text-sm text-mute">Cameras online</div>
              </div>
              <div>
                <div
                  className={`font-mono text-4xl font-semibold ${detectedCount ? "text-alert" : "text-ok"}`}
                >
                  {detectedCount}
                </div>
                <div className="mt-1 text-sm text-mute">Active alerts</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="font-mono text-xs tracking-[0.2em] text-mute">EVENT LOG</div>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              {log.length === 0 && <li className="text-mute">Monitoring. No events.</li>}
              {log.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex gap-4">
                  <span className="text-mute">{e.at}</span>
                  <span className="text-mute">
                    {CLIPS.find((c) => c.id === e.clipId)?.camera}
                  </span>
                  <span className={e.text.startsWith("Rip") ? "text-alert" : "text-ok"}>
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
