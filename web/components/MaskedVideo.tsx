"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { clipVideoUrl } from "@/lib/clips";
import { detectionsAt, loadMasks } from "@/lib/data";
import { frameIndex } from "@/lib/frames";
import type { Detection, MaskFile, MaskSource } from "@/lib/types";
import { IconCameraOff } from "./Icons";

interface Props {
  clipId: string;
  source: MaskSource;
  showMask?: boolean;
  /** Detections below this confidence are not drawn. */
  threshold?: number;
  /** 0..1, animated with a CSS transition (used by hook mode). */
  maskOpacity?: number;
  playing?: boolean;
  /** Bump to seek back to the start. */
  restartKey?: number;
  /** This instance writes its clock here every frame. */
  timeRef?: MutableRefObject<number>;
  /** This instance follows the clock in this ref instead of its own. */
  followTimeRef?: MutableRefObject<number>;
  /** Called when the frame index changes, with detections above threshold. */
  onFrame?: (detections: Detection[]) => void;
  onLoad?: (file: MaskFile) => void;
  /** Called with true once the clip has a frame to show, false if it cannot load. */
  onVideoState?: (ok: boolean) => void;
  /** "alert" (red) for RipWatch; "neutral" for other models, so only RipWatch is red. */
  tone?: Tone;
  className?: string;
}

type Tone = "alert" | "neutral";

const TONES: Record<Tone, { fill: string; stroke: string; labelBg: string; labelInk: string }> = {
  alert: { fill: "rgba(255, 45, 45, 0.30)", stroke: "#ff3b3b", labelBg: "rgba(10, 4, 4, 0.82)", labelInk: "#ffd7d7" },
  neutral: { fill: "rgba(201, 211, 222, 0.10)", stroke: "#c9d3de", labelBg: "rgba(10, 15, 21, 0.85)", labelInk: "#e6edf3" },
};

function bounds(d: Detection) {
  if (d.box) return { x1: d.box[0], y1: d.box[1], x2: d.box[2], y2: d.box[3] };
  const pts = d.polygon ?? [];
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x1) x1 = x;
    if (y < y1) y1 = y;
    if (x > x2) x2 = x;
    if (y > y2) y2 = y;
  }
  return { x1, y1, x2, y2 };
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  file: MaskFile,
  dets: Detection[],
  scale: number,
  tone: Tone,
  source: MaskSource,
) {
  const { fill: FILL, stroke: STROKE, labelBg, labelInk } = TONES[tone];
  ctx.clearRect(0, 0, file.width, file.height);
  ctx.lineJoin = "round";
  for (const d of dets) {
    const hasPoly = d.polygon && d.polygon.length >= 3;
    if (!hasPoly && !d.box) continue;

    ctx.beginPath();
    if (hasPoly) {
      d.polygon!.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    } else {
      const [x1, y1, x2, y2] = d.box!;
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
    }
    ctx.fillStyle = FILL;
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = STROKE;
    ctx.stroke();

    // Label above the shape, kept inside the frame. Gemini gives no score, so baseline boxes
    // are labelled by name only; RipWatch shows its confidence.
    const b = bounds(d);
    const fs = 13 * scale;
    ctx.font = `600 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const text = source === "baseline" ? "Gemini" : `RIP ${Math.round(d.conf * 100)}%`;
    const padX = 7 * scale;
    const h = fs + 8 * scale;
    const w = ctx.measureText(text).width + padX * 2;
    let lx = (b.x1 + b.x2) / 2 - w / 2;
    let ly = b.y1 - h - 4 * scale;
    lx = Math.min(Math.max(lx, 0), file.width - w);
    if (ly < 0) ly = b.y2 + 4 * scale;
    ctx.fillStyle = labelBg;
    ctx.fillRect(lx, ly, w, h);
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(lx, ly, w, h);
    ctx.fillStyle = labelInk;
    ctx.textBaseline = "middle";
    ctx.fillText(text, lx + padX, ly + h / 2 + 0.5 * scale);
  }
}

export default function MaskedVideo({
  clipId,
  source,
  showMask = true,
  threshold = 0.5,
  maskOpacity = 1,
  playing = true,
  restartKey = 0,
  timeRef,
  followTimeRef,
  onFrame,
  onLoad,
  onVideoState,
  tone = "alert",
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<MaskFile | null>(null);
  const [videoOk, setVideoOk] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Everything the draw loop needs lives in refs so React never re-renders per frame.
  const live = useRef({ threshold, showMask, playing, onFrame, onLoad, videoOk, tone });
  useEffect(() => {
    live.current = { threshold, showMask, playing, onFrame, onLoad, videoOk, tone };
  });
  const dirty = useRef(true);
  const synthT = useRef(0);
  const restartRef = useRef(restartKey);
  const videoStateCb = useRef(onVideoState);
  useEffect(() => {
    videoStateCb.current = onVideoState;
  });

  useEffect(() => {
    dirty.current = true;
  }, [threshold, showMask, tone]);

  useEffect(() => {
    if (videoOk) videoStateCb.current?.(true);
    else if (videoFailed) videoStateCb.current?.(false);
  }, [videoOk, videoFailed]);

  useEffect(() => {
    let cancelled = false;
    loadMasks(clipId, source)
      .then((f) => {
        if (cancelled) return;
        setFile(f);
        live.current.onLoad?.(f);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clipId, source]);

  // The error event can fire before hydration attaches onError, so check once on mount.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const id = setTimeout(() => {
      if (v.error || (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && v.readyState === 0)) {
        setVideoFailed(true);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [clipId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, videoOk]);

  useEffect(() => {
    if (restartRef.current === restartKey) return;
    restartRef.current = restartKey;
    synthT.current = 0;
    const v = videoRef.current;
    if (v) v.currentTime = 0;
    dirty.current = true;
  }, [restartKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!file || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const duration = file.frames.length / file.fps;
    let scale = 1;
    const measure = () => {
      const w = canvas.clientWidth;
      scale = w > 0 ? file.width / w : 1;
      dirty.current = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let lastIdx = -1;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const st = live.current;
      const v = videoRef.current;

      let t: number;
      if (followTimeRef) {
        t = followTimeRef.current;
        if (st.videoOk && v && v.duration > 0) {
          const target = t % v.duration;
          if (Math.abs(v.currentTime - target) > 0.12) v.currentTime = target;
        }
      } else if (st.videoOk && v) {
        t = v.currentTime;
      } else {
        if (st.playing) synthT.current = (synthT.current + dt) % duration;
        t = synthT.current;
      }
      if (timeRef) timeRef.current = t;

      const idx = frameIndex(t, file.fps);
      if (idx !== lastIdx || dirty.current) {
        const changed = idx !== lastIdx;
        lastIdx = idx;
        dirty.current = false;
        // Gemini returns no score (every baseline box carries conf 1.0), so the alert threshold
        // only applies to RipWatch's own detections.
        const all = detectionsAt(file, idx);
        const dets = source === "baseline" ? all : all.filter((d) => d.conf >= st.threshold);
        if (st.showMask) drawDetections(ctx, file, dets, scale, st.tone, source);
        else ctx.clearRect(0, 0, file.width, file.height);
        if (changed) st.onFrame?.(dets);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [file, followTimeRef, timeRef, source]);

  return (
    <div className={`relative overflow-hidden bg-[#05080c] @container ${className}`}>
      {!videoOk && (
        <div className="rw-placeholder absolute inset-0">
          {videoFailed && (
            // Low in the frame, so it stays readable when a mask is drawn over the empty feed.
            <div className="absolute inset-x-0 bottom-[14%] flex items-center justify-center gap-[0.8cqw] text-ink-3">
              <IconCameraOff className="h-[clamp(16px,1.9cqw,26px)] w-[clamp(16px,1.9cqw,26px)]" />
              <span className="text-[clamp(12px,1.35cqw,17px)]">Awaiting footage</span>
            </div>
          )}
        </div>
      )}
      <video
        ref={videoRef}
        src={clipVideoUrl(clipId)}
        className={`absolute inset-0 h-full w-full object-contain ${videoOk ? "" : "invisible"}`}
        muted
        loop
        playsInline
        autoPlay={playing}
        preload="auto"
        onLoadedData={() => setVideoOk(true)}
        onError={() => {
          setVideoOk(false);
          setVideoFailed(true);
        }}
      />
      <canvas
        ref={canvasRef}
        width={file?.width ?? 1280}
        height={file?.height ?? 720}
        className="absolute inset-0 h-full w-full object-contain transition-opacity duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: maskOpacity }}
      />
    </div>
  );
}
