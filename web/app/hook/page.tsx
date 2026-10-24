"use client";

import { useEffect, useRef, useState } from "react";
import MaskedVideo from "@/components/MaskedVideo";
import { CLIPS, DEFAULT_THRESHOLD } from "@/lib/clips";

// Keys: M fades the mask in/out, Space plays/pauses, R restarts, 1-3 switch clip.
export default function HookPage() {
  const [clipId, setClipId] = useState(CLIPS[0].id);
  const [mask, setMask] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const clock = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "m") setMask((v) => !v);
      else if (k === " ") {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (k === "r") setRestartKey((n) => n + 1);
      else if (k >= "1" && k <= String(CLIPS.length)) {
        setClipId(CLIPS[Number(k) - 1].id);
        setMask(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="fixed inset-0 cursor-none bg-black">
      <MaskedVideo
        key={clipId}
        clipId={clipId}
        source="ripwatch"
        threshold={DEFAULT_THRESHOLD}
        maskOpacity={mask ? 1 : 0}
        playing={playing}
        restartKey={restartKey}
        timeRef={clock}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-16 pb-20 pt-48 text-center">
        <h1 className="text-7xl font-semibold tracking-tight text-white drop-shadow-lg">
          Where would you swim?
        </h1>
      </div>
    </main>
  );
}
