"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { IconPause, IconPlay, IconRestart } from "@/components/Icons";
import MaskedVideo from "@/components/MaskedVideo";
import PageTransition from "@/components/PageTransition";
import StatusPill from "@/components/StatusPill";
import ThresholdControl from "@/components/ThresholdControl";
import { CLIPS, DEFAULT_THRESHOLD, SOURCE_LABEL, modelDisplay } from "@/lib/clips";
import type { MaskFile, MaskSource } from "@/lib/types";
import { useRipStatus } from "@/lib/useRipStatus";

function Side({
  clipId,
  source,
  threshold,
  playing,
  restartKey,
  timeRef,
  followTimeRef,
}: {
  clipId: string;
  source: MaskSource;
  threshold: number;
  playing: boolean;
  restartKey: number;
  timeRef?: MutableRefObject<number>;
  followTimeRef?: MutableRefObject<number>;
}) {
  const [status, onFrame, reset] = useRipStatus();
  const [signal, setSignal] = useState(false);
  const [file, setFile] = useState<MaskFile | null>(null);
  const [waited, setWaited] = useState(false);
  const ripwatch = source === "ripwatch";

  // The title is the mask file's "model" field. Hold it back briefly so it never flashes
  // from the fallback to the real name while the file loads.
  useEffect(() => {
    const id = setTimeout(() => setWaited(true), 1000);
    return () => clearTimeout(id);
  }, []);
  const ready = !!file || waited;
  const { title, rawId } = modelDisplay(file?.model, source);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex h-19 items-end justify-between gap-4 px-1 max-lg:h-auto">
        <div className="min-w-0">
          <div className="text-[13px] text-ink-3">{SOURCE_LABEL[source]}</div>
          <h2
            className={`mt-0.5 truncate text-xl font-semibold tracking-[-0.01em] transition-opacity duration-200 max-lg:overflow-visible max-lg:whitespace-normal ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            {ready ? title : " "}
          </h2>
          {/* Always takes up its line, so both panes stay level whether or not a raw id is shown. */}
          <div className="h-4.5 truncate font-mono text-xs text-ink-3">{ready && rawId ? rawId : " "}</div>
        </div>
        <StatusPill active={status.active} tone={ripwatch ? "alert" : "neutral"} noSignal={!signal} />
      </div>
      <div className="relative">
        <MaskedVideo
          clipId={clipId}
          source={source}
          tone={ripwatch ? "alert" : "neutral"}
          threshold={threshold}
          playing={playing}
          restartKey={restartKey}
          timeRef={timeRef}
          followTimeRef={followTimeRef}
          onFrame={onFrame}
          onLoad={setFile}
          onVideoState={(ok) => {
            setSignal(ok);
            if (!ok) reset();
          }}
          className="aspect-video w-full rounded-xl"
        />
        <span
          className={`pointer-events-none absolute inset-0 rounded-xl border ${
            ripwatch && signal && status.active ? "border-2 border-rip" : "border-line-2"
          }`}
        />
      </div>
    </section>
  );
}

/** Reads the shared clock ref a few times a second; the panes keep syncing on their own. */
function ClockReadout({ clock }: { clock: MutableRefObject<number> }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(clock.current), 250);
    return () => clearInterval(id);
  }, [clock]);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return (
    <span className="font-mono text-sm text-ink">
      {String(m).padStart(2, "0")}:{s.toFixed(1).padStart(4, "0")}
    </span>
  );
}

export default function ComparePage() {
  const [clipId, setClipId] = useState(CLIPS[0].id);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [playing, setPlaying] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const clock = useRef(0);

  return (
    <PageTransition>
      <main className="flex h-[calc(100dvh-56px)] flex-col gap-5 px-8 pb-8 pt-5 max-lg:h-auto max-lg:px-4 max-lg:pb-6">
        <div className="flex h-10 shrink-0 items-center justify-between max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-3">
          <div className="flex items-center gap-6 max-lg:flex-wrap max-lg:gap-y-3">
            <h1 className="text-xl font-semibold tracking-[-0.01em]">Compare models</h1>
            <div className="rw-seg" role="group" aria-label="Camera">
              {CLIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === clipId}
                  onClick={() => setClipId(c.id)}
                  className="rw-seg-item"
                >
                  <span className="font-mono text-[13px]">{c.camera}</span>
                  <span className="ml-2 max-sm:hidden">{c.location}</span>
                </button>
              ))}
            </div>
          </div>
          <ThresholdControl value={threshold} onChange={setThreshold} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
          <div className="flex gap-6 max-lg:flex-col" key={clipId}>
            <Side
              clipId={clipId}
              source="baseline"
              threshold={threshold}
              playing={playing}
              restartKey={restartKey}
              timeRef={clock}
            />
            <Side
              clipId={clipId}
              source="ripwatch"
              threshold={threshold}
              playing={playing}
              restartKey={restartKey}
              followTimeRef={clock}
            />
          </div>

          <div className="rw-panel flex h-16 shrink-0 items-center justify-between px-5 max-lg:h-auto max-lg:flex-col max-lg:items-stretch max-lg:gap-4 max-lg:px-4 max-lg:py-4">
            <div className="flex items-center gap-3 max-lg:flex-wrap">
              <button type="button" onClick={() => setPlaying((p) => !p)} className="rw-btn rw-btn-primary w-28">
                {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
                {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => setRestartKey((k) => k + 1)} className="rw-btn">
                <IconRestart size={16} />
                Restart
              </button>
              <span className="ml-3 flex items-center gap-2 text-sm text-ink-3 max-lg:ml-0">
                Shared clock <ClockReadout clock={clock} />
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-ink-2 max-lg:flex-wrap max-lg:gap-x-4 max-lg:gap-y-2">
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-5 rounded-xs border border-det bg-det/10" />
                Baseline boxes
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-5 rounded-xs border border-rip bg-rip/30" />
                RipWatch mask
              </span>
              <span className="text-ink-3">Same footage, one shared clock</span>
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
