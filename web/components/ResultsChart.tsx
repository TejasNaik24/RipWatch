"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metrics } from "@/lib/types";

const fmt = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

export default function ResultsChart({ metrics }: { metrics: Metrics }) {
  const data = metrics.models.map((m) => ({
    name: m.name,
    F2: m.f2,
    Precision: m.precision,
    Recall: m.recall,
  }));
  const label = { fill: "#e8eef5", fontSize: 13, formatter: fmt };
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1100, height: 560 }}>
      <BarChart data={data} margin={{ top: 28, right: 16, bottom: 8, left: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke="#1c2633" vertical={false} />
        <XAxis dataKey="name" stroke="#8795a8" tick={{ fill: "#e8eef5", fontSize: 15 }} tickLine={false} />
        <YAxis domain={[0, 1]} stroke="#8795a8" tick={{ fill: "#8795a8", fontSize: 13 }} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{ background: "#0c1118", border: "1px solid #1c2633", borderRadius: 8 }}
          formatter={fmt}
        />
        <Legend wrapperStyle={{ paddingTop: 12 }} />
        <Bar dataKey="F2" fill="#ff3b3b" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="F2" position="top" {...label} />
        </Bar>
        <Bar dataKey="Precision" fill="#5b8def" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="Precision" position="top" {...label} />
        </Bar>
        <Bar dataKey="Recall" fill="#f5a524" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="Recall" position="top" {...label} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
