"use client";

export default function ThresholdControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 font-mono text-xs tracking-wider text-mute">
      ALERT THRESHOLD
      <input
        type="range"
        min={0.05}
        max={0.95}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-40 cursor-pointer accent-[#ff3b3b]"
      />
      <span className="w-10 text-ink">{Math.round(value * 100)}%</span>
    </label>
  );
}
