"use client";

import { useRef, useState } from "react";
import MaskedVideo from "@/components/MaskedVideo";
import StatusPill from "@/components/StatusPill";
import ThresholdControl from "@/components/ThresholdControl";
import { CLIPS, DEFAULT_THRESHOLD, SOURCE_LABEL } from "@/lib/clips";
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
  timeRef?: React.MutableRefObject<number>;
  followTimeRef?: React.MutableRefObject<number>;
}) {
  const [status, onFrame] = useRipStatus();
  const [file, setFile] = useState<MaskFile | null>(null);
  const ripwatch = source === "ripwatch";
  return (
    <section
      className={`min-w-0 flex-1 overflow-hidden rounded-lg border bg-panel ${
        ripwatch ? "border-alert/50" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="text-2xl font-semibold tracking-wide">{SOURCE_LABEL[source]}</div>
          <div className="mt-1 font-mono text-xs tracking-wider text-mute">
            {file?.model ?? "loading model"}
          </div>
        </div>
        <StatusPill active={status.active} />
      </div>
      <MaskedVideo
        clipId={clipId}
        source={source}
        threshold={threshold}
        playing={playing}
        restartKey={restartKey}
        timeRef={timeRef}
        followTimeRef={followTimeRef}
        onFrame={onFrame}
        onLoad={setFile}
        className="aspect-video w-full"
      />
    </section>
  );
}

export default function ComparePage() {
  const [clipId, setClipId] = useState(CLIPS[0].id);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [playing, setPlaying] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const clock = useRef(0);

  return (
    <main className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex h-9 items-center justify-between">
        <div className="flex items-center gap-2">
          {CLIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClipId(c.id)}
              className={`rounded-md border px-4 py-1.5 text-sm ${
                c.id === clipId
                  ? "border-ink/40 bg-panel2 text-ink"
                  : "border-line text-mute hover:text-ink"
              }`}
            >
              {c.camera} · {c.location}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <ThresholdControl value={threshold} onChange={setThreshold} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="w-24 rounded-md border border-line px-4 py-1.5 font-mono text-xs tracking-wider hover:border-mute"
            >
              {playing ? "PAUSE" : "PLAY"}
            </button>
            <button
              type="button"
              onClick={() => setRestartKey((k) => k + 1)}
              className="rounded-md border border-line px-4 py-1.5 font-mono text-xs tracking-wider text-mute hover:text-ink"
            >
              RESTART
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-6" key={clipId}>
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
    </main>
  );
}
