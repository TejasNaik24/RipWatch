"use client";

import { useEffect, useState } from "react";
import { IconInfo } from "@/components/Icons";
import PageTransition from "@/components/PageTransition";
import ResultsChart, { isRipWatch, modelColors } from "@/components/ResultsChart";
import { loadMetrics } from "@/lib/data";
import type { Metrics } from "@/lib/types";

const LIMITATIONS = [
  "Advisory only. A lifeguard makes every call; RipWatch never closes a beach on its own.",
  "Evaluated on held-out frames from the RipVIS validation split, not yet on live beach cameras.",
  "Not evaluated on flash rips, which can form and fade quickly.",
  "Performance in rain, fog, glare and at night has not been measured.",
  "Trained on RipVIS, which is licensed for non-commercial use only.",
];

export default function ResultsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadMetrics().then(setMetrics).catch(() => setFailed(true));
  }, []);

  const models = metrics?.models ?? [];
  const colors = modelColors(models.map((m) => m.name));
  const best = models.length ? models.reduce((a, b) => (b.f2 > a.f2 ? b : a)) : undefined;
  const ours = models.find((m) => isRipWatch(m.name)) ?? best;
  const others = models.filter((m) => m !== ours);
  const baseline = others.length ? others.reduce((a, b) => (b.f2 > a.f2 ? b : a)) : undefined;

  return (
    <PageTransition>
      <main className="flex h-[calc(100dvh-56px)] min-h-0 flex-col gap-6 px-8 pb-8 pt-6">
        <div className="flex shrink-0 items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">Model comparison</h1>
            <p className="mt-1 text-sm text-ink-2">
              Box-level scores on{" "}
              <span className="font-mono text-ink">{metrics ? metrics.heldOutFrames : "–"}</span> held-out frames
              the models never trained on.
            </p>
          </div>
          {metrics?.fake && (
            <span className="rounded-md border border-dashed border-line-3 px-3 py-1.5 font-mono text-xs font-medium text-ink-2">
              PLACEHOLDER DATA
            </span>
          )}
        </div>

        {failed && (
          <p className="text-ink-2">Could not load metrics.json. Check that web/public/data/metrics.json exists.</p>
        )}

        {metrics && ours && (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_480px] gap-6">
            <section className="rw-panel flex min-h-0 flex-col p-6">
              <div className="flex shrink-0 items-center justify-between">
                <h2 className="text-base font-semibold">Scores by metric</h2>
                <ul className="flex items-center gap-6 text-sm" aria-label="Legend">
                  {models.map((m, i) => (
                    <li key={m.name} className={`flex items-center gap-2 ${m === ours ? "text-ink" : "text-ink-2"}`}>
                      <span className="h-3 w-3 rounded-xs" style={{ background: colors[i] }} />
                      {m.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 min-h-0 flex-1">
                <ResultsChart metrics={metrics} />
              </div>
            </section>

            <div className="flex min-h-0 flex-col gap-6">
              <section className="rw-panel p-6">
                <h2 className="text-sm text-ink-2">{ours.name}, F2</h2>
                <div className="mt-3 flex items-end gap-5">
                  <span className="font-mono text-[64px] font-medium leading-none tracking-[-0.04em] text-sea">
                    {ours.f2.toFixed(2)}
                  </span>
                  {baseline && (
                    <div className="pb-1.5">
                      <div className="font-mono text-[28px] leading-none text-ink-2">{baseline.f2.toFixed(2)}</div>
                      <div className="mt-1 text-[13px] text-ink-3">{baseline.name}</div>
                    </div>
                  )}
                </div>
                {baseline && (
                  <div className="mt-4 text-sm text-ink-2">
                    <span className="font-mono text-ink">
                      {ours.f2 - baseline.f2 >= 0 ? "+" : "−"}
                      {Math.abs(ours.f2 - baseline.f2).toFixed(2)}
                    </span>{" "}
                    F2 over the best baseline
                  </div>
                )}
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
                  F2 weights recall above precision, because a missed rip current costs more than a false alarm.
                </p>
              </section>

              {metrics.notes && (
                <section className="rw-panel p-6">
                  <h2 className="text-sm font-semibold">How it was measured</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{metrics.notes}</p>
                </section>
              )}

              <section className="rw-panel min-h-0 flex-1 p-6">
                <h2 className="text-sm font-semibold">Known limitations</h2>
                <ul className="mt-3 space-y-2.5">
                  {LIMITATIONS.map((t) => (
                    <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                      <IconInfo size={16} className="mt-0.5 shrink-0 text-ink-3" />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
