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
      <main className="flex h-[calc(100dvh-56px)] min-h-0 flex-col gap-5 px-8 pb-6 pt-5">
        <div className="flex shrink-0 items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.01em]">Model comparison</h1>
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
          <>
            {/* The chart takes whatever height the strip below leaves, so the page never scrolls. */}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(340px,28%)] gap-5">
              <section className="rw-panel flex min-h-0 min-w-0 flex-col px-6 pb-4 pt-5">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1">
                  <h2 className="text-base font-semibold">Scores by metric</h2>
                  <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-label="Legend">
                    {models.map((m, i) => (
                      <li key={m.name} className={`flex items-center gap-2 ${m === ours ? "text-ink" : "text-ink-2"}`}>
                        <span className="h-3 w-3 rounded-xs" style={{ background: colors[i] }} />
                        {m.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 min-h-0 flex-1">
                  <ResultsChart metrics={metrics} />
                </div>
              </section>

              <section className="rw-panel flex min-h-0 flex-col justify-center p-6">
                <h2 className="text-sm text-ink-2">{ours.name}, F2</h2>
                <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <span className="font-mono text-[56px] font-medium leading-tight tracking-[-0.04em] text-sea">
                    {ours.f2.toFixed(2)}
                  </span>
                  {baseline && (
                    <div className="pb-1">
                      <div className="font-mono text-2xl leading-tight text-ink-2">{baseline.f2.toFixed(2)}</div>
                      <div className="mt-1 text-[13px] text-ink-3">{baseline.name}</div>
                    </div>
                  )}
                </div>
                {baseline && (
                  <div className="mt-3 text-sm text-ink-2">
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
            </div>

            <div className="grid shrink-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
              <section className="rw-panel px-6 py-5">
                <h2 className="text-sm font-semibold">How it was measured</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  {metrics.notes || "No measurement notes were provided with these results."}
                </p>
              </section>
              <section className="rw-panel px-6 py-5">
                <h2 className="text-sm font-semibold">Known limitations</h2>
                <ul className="mt-2 columns-2 gap-x-8">
                  {LIMITATIONS.map((t) => (
                    <li key={t} className="mb-2 flex break-inside-avoid gap-2.5 text-[13px] leading-relaxed text-ink-2">
                      <IconInfo size={15} className="mt-[3px] shrink-0 text-ink-3" />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </PageTransition>
  );
}
