"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIPS, DEFAULT_THRESHOLD } from "@/lib/clips";
import type { RipStatus } from "@/lib/useRipStatus";
import AlertCard from "./AlertCard";
import EventLog, { type LogEntry } from "./EventLog";
import FeedTile from "./FeedTile";
import { IconAlert, IconClear } from "./Icons";
import { formatTime } from "./LiveClock";
import PageTransition from "./PageTransition";
import ThresholdControl from "./ThresholdControl";

export default function Dashboard() {
  const [heroId, setHeroId] = useState(CLIPS[0].id);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [statuses, setStatuses] = useState<Record<string, RipStatus>>({});
  const [since, setSince] = useState<Record<string, number>>({});
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [video, setVideo] = useState<Record<string, boolean>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [watchingSince, setWatchingSince] = useState<number | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setWatchingSince(Date.now()), 0);
    return () => clearTimeout(id);
  }, []);

  const addLog = useCallback((clipId: string, kind: LogEntry["kind"], text: string) => {
    seq.current += 1;
    const entry = { id: seq.current, at: formatTime(new Date()), clipId, kind, text };
    setLog((l) => [entry, ...l].slice(0, 12));
  }, []);

  const onStatus = useCallback(
    (clipId: string, s: RipStatus, prev: RipStatus) => {
      setStatuses((m) => ({ ...m, [clipId]: s }));
      if (s.active === prev.active) return;
      if (s.active) setSince((m) => ({ ...m, [clipId]: Date.now() }));
      else setAcked((m) => ({ ...m, [clipId]: false }));
      addLog(
        clipId,
        s.active ? "alert" : "clear",
        s.active ? `Rip detected ${Math.round(s.conf * 100)}%` : "Area clear",
      );
    },
    [addLog],
  );

  const onVideoState = useCallback((clipId: string, ok: boolean) => {
    setVideo((m) => (m[clipId] === ok ? m : { ...m, [clipId]: ok }));
  }, []);

  const acknowledge = (clipId: string) => {
    setAcked((m) => ({ ...m, [clipId]: true }));
    addLog(clipId, "ack", "Acknowledged");
  };

  // 1-3 put that camera in the main view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= CLIPS.length) setHeroId(CLIPS[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hero = CLIPS.find((c) => c.id === heroId) ?? CLIPS[0];
  const rail = CLIPS.filter((c) => c.id !== hero.id);
  const alerting = CLIPS.filter((c) => statuses[c.id]?.active);
  const streaming = CLIPS.filter((c) => video[c.id]).length;

  return (
    <PageTransition>
      <main className="flex h-[calc(100dvh-56px)] flex-col gap-5 px-8 pb-6 pt-5">
        <div className="flex h-10 shrink-0 items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold tracking-[-0.01em]">Beach cameras</h1>
            <div className="flex items-center gap-4 text-sm text-ink-2">
              <span>
                <span className="font-mono text-ink">{streaming}</span> of{" "}
                <span className="font-mono text-ink">{CLIPS.length}</span> streaming
              </span>
              <span className="h-4 w-px bg-line-2" />
              {alerting.length ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-rip">
                  <IconAlert size={16} />
                  <span className="font-mono">{alerting.length}</span>
                  {alerting.length === 1 ? "active alert" : "active alerts"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sea">
                  <IconClear size={16} />
                  No active alerts
                </span>
              )}
            </div>
          </div>
          <ThresholdControl value={threshold} onChange={setThreshold} />
        </div>

        <div className="rw-command min-h-0 flex-1">
          <div className="rw-cmd-grid">
            {CLIPS.map((clip) => {
              const isHero = clip.id === hero.id;
              const slot = rail.findIndex((c) => c.id === clip.id);
              return (
                <FeedTile
                  key={clip.id}
                  clip={clip}
                  hero={isHero}
                  threshold={threshold}
                  acked={!!acked[clip.id]}
                  hasVideo={!!video[clip.id]}
                  onSelect={() => setHeroId(clip.id)}
                  onStatus={onStatus}
                  onVideoState={onVideoState}
                  style={isHero ? { gridColumn: 1, gridRow: "1 / span 2" } : { gridColumn: 2, gridRow: slot + 1 }}
                />
              );
            })}
            <AlertCard
              style={{ gridColumn: 1, gridRow: 3 }}
              clip={hero}
              status={statuses[hero.id]}
              acked={!!acked[hero.id]}
              since={since[hero.id] ?? null}
              watchingSince={watchingSince}
              others={alerting.filter((c) => c.id !== hero.id)}
              onAcknowledge={() => acknowledge(hero.id)}
              onView={setHeroId}
            />
            <EventLog style={{ gridColumn: 2, gridRow: 3 }} entries={log} clips={CLIPS} />
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
