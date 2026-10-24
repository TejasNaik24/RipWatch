"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Metrics, ModelMetrics } from "@/lib/types";

const METRICS = [
  { key: "f2", label: "F2" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
] as const;

const SEA = "#4fb8ac";
const NEUTRALS = ["#8c99aa", "#566273", "#3d4756"];
const MONO = "var(--font-plex-mono), ui-monospace, monospace";

export const isRipWatch = (name: string) => /ripwatch/i.test(name);

/** RipWatch gets the accent; every other model a neutral gray, in order. */
export function modelColors(names: string[]) {
  let n = 0;
  return names.map((name) => (isRipWatch(name) ? SEA : NEUTRALS[Math.min(n++, NEUTRALS.length - 1)]));
}

const fmt = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

/** Chart values for one model: image level when asked for and present, else the top-level box-level fields. */
export const scoresFor = (m: ModelMetrics, level: "image" | "box") =>
  level === "image" && m.imageLevel ? m.imageLevel : m;

// Grouped by metric: one cluster each for F2, precision and recall, one bar per model.
export default function ResultsChart({ metrics, level = "box" }: { metrics: Metrics; level?: "image" | "box" }) {
  const models = metrics.models;
  const colors = modelColors(models.map((m) => m.name));
  const data = METRICS.map(({ key, label }) => ({
    metric: label,
    ...Object.fromEntries(models.map((m, i) => [`m${i}`, scoresFor(m, level)[key]])),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1100, height: 600 }}>
      <BarChart data={data} margin={{ top: 32, right: 8, bottom: 4, left: -8 }} barCategoryGap="22%" barGap={10}>
        <CartesianGrid stroke="rgba(190,210,235,0.08)" vertical={false} />
        <XAxis
          dataKey="metric"
          axisLine={{ stroke: "rgba(190,210,235,0.14)" }}
          tickLine={false}
          tick={{ fill: "#e6edf3", fontSize: 16, fontWeight: 500 }}
          tickMargin={12}
        />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => v.toFixed(2)}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#7a889a", fontSize: 13, fontFamily: MONO }}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{ background: "#18212c", border: "1px solid rgba(190,210,235,0.14)", borderRadius: 8 }}
          labelStyle={{ color: "#e6edf3", fontWeight: 600 }}
          itemStyle={{ fontFamily: MONO }}
          formatter={fmt}
        />
        {models.map((m, i) => (
          <Bar key={m.name} dataKey={`m${i}`} name={m.name} fill={colors[i]} radius={[4, 4, 0, 0]} maxBarSize={96}>
            <LabelList
              dataKey={`m${i}`}
              position="top"
              offset={10}
              formatter={fmt}
              fill={isRipWatch(m.name) ? "#e6edf3" : "#9daaba"}
              fontSize={15}
              fontFamily={MONO}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
