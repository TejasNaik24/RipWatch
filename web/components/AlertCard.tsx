import type { CSSProperties, ReactNode } from "react";
import type { ClipMeta } from "@/lib/clips";
import type { RipStatus } from "@/lib/useRipStatus";
import { IconAlert, IconCameraOff, IconCheck, IconClear } from "./Icons";
import { Elapsed } from "./LiveClock";

function Cell({ label, children, alert }: { label: string; children: ReactNode; alert?: boolean }) {
  return (
    <div className="shrink-0">
      <dt className="whitespace-nowrap text-[13px] text-ink-3">{label}</dt>
      <dd className={`mt-1 whitespace-nowrap font-mono text-[28px] leading-tight ${alert ? "text-rip" : "text-ink"}`}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Status panel under the main feed. Always present (so nothing shifts), it turns into the
 * alert card when the main camera sees a rip: red edge and tint, a short rise-in, and a
 * pulse that stops once a lifeguard acknowledges it.
 */
export default function AlertCard({
  clip,
  status,
  noSignal = false,
  acked,
  since,
  watchingSince,
  others,
  onAcknowledge,
  onView,
  style,
}: {
  clip: ClipMeta;
  status?: RipStatus;
  /** The main camera has no loaded video: neutral "No signal" card, never an alert. */
  noSignal?: boolean;
  acked: boolean;
  since: number | null;
  watchingSince: number | null;
  others: ClipMeta[];
  onAcknowledge: () => void;
  onView: (clipId: string) => void;
  style?: CSSProperties;
}) {
  const active = !noSignal && !!status?.active;
  const message = noSignal
    ? "Awaiting footage from this camera. Nothing is being analysed until video loads."
    : active
    ? acked
      ? "Acknowledged. Keep the zone flagged until this feed clears."
      : "Send a lifeguard to check the water and flag the zone."
    : others.length
      ? `${others.length === 1 ? "Another camera has" : `${others.length} other cameras have`} an active alert.`
      : "Watching for rip currents. Advisory only: lifeguards and posted beach flags have the final say.";

  return (
    <section
      style={style}
      role={active ? "alert" : "status"}
      className={`relative flex min-h-0 overflow-hidden rounded-xl border ${
        active
          ? "border-rip/45 bg-[linear-gradient(90deg,rgba(255,59,59,0.16),rgba(255,59,59,0.05)_55%,var(--panel))]"
          : "border-line bg-panel"
      } ${active && !acked ? "rw-alert-pulse" : ""}`}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1 bg-rip" />}
      <div key={noSignal ? "nosignal" : active ? "alert" : "clear"} className="rw-rise flex min-w-0 flex-1 items-center gap-6 px-6 py-3 max-lg:flex-col max-lg:items-stretch max-lg:gap-4 max-lg:px-4 max-lg:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${
              active ? "bg-rip/15 text-rip" : noSignal ? "bg-white/6 text-ink-2" : "bg-sea/10 text-sea"
            }`}
          >
            {active ? <IconAlert size={28} /> : noSignal ? <IconCameraOff size={28} /> : <IconClear size={28} />}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-ink-2">
              <span className="font-mono">{clip.camera}</span> · {clip.location}
            </div>
            <div className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.01em]">
              {active ? "Rip current detected" : noSignal ? "No signal" : "Clear"}
            </div>
            <p className="mt-1 text-sm leading-snug text-ink-2">{message}</p>
          </div>
        </div>

        <dl className="flex shrink-0 items-center gap-6 max-lg:flex-wrap">
          <Cell label="Confidence" alert={active}>
            {active ? `${Math.round((status?.conf ?? 0) * 100)}%` : "–"}
          </Cell>
          <Cell label={active ? "Active for" : "Watching for"}>
            <Elapsed since={active ? since : watchingSince} />
          </Cell>
        </dl>

        <div className="flex shrink-0 justify-end max-lg:justify-start">
          {active ? (
            acked ? (
              <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-ink-2">
                <IconCheck size={18} />
                Acknowledged
              </span>
            ) : (
              <button type="button" onClick={onAcknowledge} className="rw-btn rw-btn-light h-11 whitespace-nowrap px-5 text-[15px] max-lg:w-full">
                Acknowledge
              </button>
            )
          ) : (
            others.length > 0 && (
              <button type="button" onClick={() => onView(others[0].id)} className="rw-btn h-11 whitespace-nowrap px-5 text-[15px] max-lg:w-full">
                View {others[0].camera}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
