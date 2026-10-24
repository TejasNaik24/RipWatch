import type { ClipMeta } from "@/lib/clips";

export default function AlertCard({
  show,
  clip,
  conf,
}: {
  show: boolean;
  clip: ClipMeta;
  conf: number;
}) {
  return (
    <div
      className={`rounded-lg border border-alert/60 bg-gradient-to-br from-alert/20 to-panel p-5 transition-all duration-500 ease-out ${
        show ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-24 opacity-0"
      }`}
      role="alert"
      aria-hidden={!show}
    >
      <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.2em] text-alert">
        <span className="rw-blink h-2 w-2 rounded-full bg-alert" />
        ALERT · RIP CURRENT
      </div>
      <div className="mt-3 text-2xl font-semibold">{clip.camera} · {clip.location}</div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-sm text-mute">Dispatch lifeguard to flag the zone</span>
        <span className="font-mono text-3xl font-semibold text-alert">
          {Math.round(conf * 100)}%
        </span>
      </div>
    </div>
  );
}
