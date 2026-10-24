import { IconAlert, IconClear } from "./Icons";

// Color is always paired with a shape: a triangle for a rip, a circle for clear.
// tone="neutral" is for detections that are not RipWatch's (the baseline), so they never read as red.
export default function StatusPill({
  active,
  tone = "alert",
  pulsing = false,
  size = "md",
}: {
  active: boolean;
  tone?: "alert" | "neutral";
  pulsing?: boolean;
  size?: "sm" | "md";
}) {
  const base = `inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium ${
    size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]"
  }`;
  const icon = size === "sm" ? 13 : 14;
  if (!active) {
    return (
      <span className={`${base} border-sea/35 bg-sea/10 text-sea`}>
        <IconClear size={icon} />
        Clear
      </span>
    );
  }
  if (tone === "neutral") {
    return (
      <span className={`${base} border-line-3 bg-white/6 text-ink`}>
        <span className="h-2 w-2 rounded-xs border border-det" />
        Detection
      </span>
    );
  }
  return (
    <span className={`${base} border-rip/55 bg-rip/15 text-rip ${pulsing ? "rw-alert-pulse" : ""}`}>
      <IconAlert size={icon} />
      Rip detected
    </span>
  );
}
