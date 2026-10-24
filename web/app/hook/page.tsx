"use client";

import { useEffect, useRef, useState } from "react";
import MaskedVideo from "@/components/MaskedVideo";
import PageTransition from "@/components/PageTransition";
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
    <PageTransition>
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-linear-to-t from-black/80 via-black/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-16 pb-24 text-center">
          <h1 className="text-[88px] font-semibold leading-none tracking-[-0.03em] text-white [text-shadow:0_2px_32px_rgba(0,0,0,0.45)]">
            Where would you swim?
          </h1>
        </div>
      </main>
    </PageTransition>
  );
}
