"use client";

import { useState, type CSSProperties } from "react";
import type { ClipMeta } from "@/lib/clips";
import { useRipStatus, type RipStatus } from "@/lib/useRipStatus";
import LiveClock from "./LiveClock";
import MaskedVideo from "./MaskedVideo";
import StatusPill from "./StatusPill";

/**
 * One camera on the Command page. The same component renders the hero and the strip
 * tiles, and keeps its place in the tree when it changes role, so the video and its
 * alert state never restart when the operator switches cameras.
 */
export default function FeedTile({
  clip,
  hero,
  threshold,
  acked,
  hasVideo,
  onSelect,
  onStatus,
  onVideoState,
  style,
}: {
  clip: ClipMeta;
  hero: boolean;
  threshold: number;
  acked: boolean;
  hasVideo: boolean;
  onSelect: () => void;
  onStatus: (clipId: string, s: RipStatus, prev: RipStatus) => void;
  onVideoState: (clipId: string, ok: boolean) => void;
  style?: CSSProperties;
}) {
  const [status, onFrame, reset] = useRipStatus((s, prev) => onStatus(clip.id, s, prev));
  // Only a loaded video can raise an alert; without one the tile reads "No signal".
  const [signal, setSignal] = useState(false);
  const alerting = signal && status.active;
  const pulsing = alerting && !acked;

  return (
    <div style={style} className="flex min-h-0 min-w-0 flex-col">
      {/* Hero: fills its grid cell (the video letterboxes). Side feeds: exactly 16:9. */}
      <div className={`group relative w-full ${hero ? "min-h-0 flex-1" : ""}`}>
        <MaskedVideo
          clipId={clip.id}
          source="ripwatch"
          threshold={threshold}
          onFrame={onFrame}
          onVideoState={(ok) => {
            setSignal(ok);
            onVideoState(clip.id, ok); // before reset(), so the Dashboard knows not to log the drop
            if (!ok) reset();
          }}
          className={`w-full rounded-xl ${hero ? "h-full" : "aspect-video"}`}
        />
        {/* Frame: quiet hairline normally, red only while this camera sees a rip. */}
        <span
          className={`pointer-events-none absolute inset-0 rounded-xl border transition-colors duration-200 ${
            alerting ? "border-2 border-rip" : "border-line-2 group-hover:border-line-3"
          } ${pulsing ? "rw-alert-pulse" : ""}`}
        />
        {hero ? (
          <>
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2.5 rounded-md bg-black/55 px-3 py-1.5 text-sm backdrop-blur-sm">
              <span className="font-mono text-[13px] text-ink">{clip.camera}</span>
              <span className="text-ink/90">{clip.location}</span>
              {hasVideo && (
                <span className="ml-1 flex items-center gap-1.5 text-[13px] text-ink-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/80" />
                  Live
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute right-4 top-4">
              <StatusPill active={alerting} pulsing={pulsing} noSignal={!signal} />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-black/55 px-2.5 py-1 backdrop-blur-sm">
              <LiveClock className="text-[13px] text-ink/90" />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Show ${clip.camera}, ${clip.location}, as the main feed`}
            className="absolute inset-0 cursor-pointer rounded-xl"
          />
        )}
      </div>
      {!hero && (
        // The camera id never wraps; the full location name does, if the tile is narrow.
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 whitespace-nowrap font-mono text-[13px] text-ink-2">{clip.camera}</span>
            <span className="min-w-0 text-[13px] leading-tight text-ink">{clip.location}</span>
          </div>
          <StatusPill active={alerting} pulsing={pulsing} size="sm" noSignal={!signal} />
        </div>
      )}
    </div>
  );
}
