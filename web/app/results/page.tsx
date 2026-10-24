"use client";

import { useEffect, useState } from "react";
import ResultsChart from "@/components/ResultsChart";
import { loadMetrics } from "@/lib/data";
import type { Metrics } from "@/lib/types";

export default function ResultsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadMetrics().then(setMetrics).catch(() => setFailed(true));
  }, []);

  const best = metrics?.models.reduce((a, b) => (b.f2 > a.f2 ? b : a));

  return (
    <main className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex h-9 items-center justify-between">
        <h1 className="text-xl font-semibold tracking-wide">Model Performance</h1>
        {metrics?.fake && (
          <span className="rounded-md border border-amber/50 bg-amber/10 px-3 py-1 font-mono text-xs tracking-wider text-amber">
            PLACEHOLDER DATA
          </span>
        )}
      </div>

      {failed && <p className="text-mute">Could not load metrics.json.</p>}

      {metrics && best && (
        <div className="grid grid-cols-[1fr_520px] gap-6">
          <section className="flex h-[760px] flex-col rounded-lg border border-line bg-panel p-6">
            <div className="flex items-baseline justify-between">
              <div className="font-mono text-xs tracking-[0.2em] text-mute">
                HELD-OUT FRAMES
              </div>
              <div className="font-mono text-2xl font-semibold">{metrics.heldOutFrames}</div>
            </div>
            <div className="mt-4 min-h-0 flex-1">
              <ResultsChart metrics={metrics} />
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-lg border border-line bg-panel p-6">
              <div className="font-mono text-xs tracking-[0.2em] text-mute">BEST F2</div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold">{best.name}</span>
                <span className="font-mono text-5xl font-semibold text-alert">
                  {best.f2.toFixed(2)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-mute">
                F2 weights recall higher than precision, because a missed rip current costs more than a false alarm.
              </p>
              {metrics.notes && (
                <p className="mt-3 font-mono text-xs text-amber">{metrics.notes}</p>
              )}
            </section>

            <section className="rounded-lg border border-line bg-panel p-6">
              <div className="font-mono text-xs tracking-[0.2em] text-mute">LIMITS</div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/90">
                <li>Placeholder: evaluated on a small held-out set from a limited number of beaches.</li>
                <li>Placeholder: performance in rain, glare, low light and heavy surf is untested.</li>
                <li>Placeholder: a supervised aid for lifeguards, not a replacement for them.</li>
                <li>Placeholder: fixed camera angles only, no drone or handheld footage.</li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
