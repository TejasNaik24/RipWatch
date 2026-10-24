"use client";

import { useEffect, useState } from "react";
import { IconInfo } from "@/components/Icons";
import PageTransition from "@/components/PageTransition";
import ResultsChart, { isRipWatch, modelColors } from "@/components/ResultsChart";
import { loadMetrics } from "@/lib/data";
import type { Metrics, ModelMetrics } from "@/lib/types";

const LIMITATIONS = [
  "Advisory only. A lifeguard makes every call; RipWatch never closes a beach on its own.",
  "Evaluated on held-out frames from the RipVIS validation split, not yet on live beach cameras.",
  "Not evaluated on flash rips, which can form and fade quickly.",
  "Performance in rain, fog, glare and at night has not been measured.",
  "Trained on RipVIS, which is licensed for non-commercial use only.",
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Precision sentence for the headline card, from the data: only claims "about N% precise" when both agree. */
function precisionLine(a: ModelMetrics, b: ModelMetrics) {
  const pa = a.imageLevel!.precision;
  const pb = b.imageLevel!.precision;
  if (Math.min(pa, pb) >= 0.9 && Math.abs(pa - pb) <= 0.05) {
    return `Both models are about ${pct((pa + pb) / 2)} precise; the difference is how many rips they catch.`;
  }
  return `Precision is ${pct(pa)} for ${a.name} and ${pct(pb)} for ${b.name}; recall differs too.`;
}

/** The RipWatch confidence threshold is written into the notes string by eval_compare.py ("confidence >= 0.25"). */
const confFromNotes = (notes: string) => notes.match(/confidence\s*>=\s*([\d.]+\d)/)?.[1];

function HeadlineBar({ label, value, total, accent }: { label: string; value: number; total: number; accent: boolean }) {
  const w = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className={`text-[13px] ${accent ? "text-ink" : "text-ink-3"}`}>{label}</div>
      <div className="mt-1 flex items-center gap-4">
        <span
          className={`whitespace-nowrap font-mono text-[40px] font-medium leading-tight tracking-[-0.03em] ${accent ? "text-sea" : "text-ink-2"}`}
        >
          {value}
          <span className="ml-1 text-base text-ink-3">/ {total}</span>
        </span>
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full" style={{ width: `${w}%`, background: accent ? "#4fb8ac" : "#8c99aa" }} />
        </div>
      </div>
    </div>
  );
}

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
  // Image-level layout needs every model's imageLevel; older files fall back to the box-level layout.
  const imageMode = models.length > 0 && models.every((m) => m.imageLevel);
  const ripFrames = metrics?.ripFrames;
  const noRipFrames = metrics?.noRipFrames;
  const conf = metrics ? confFromNotes(metrics.notes) : undefined;

  return (
    <PageTransition>
      <main className="flex h-[calc(100dvh-56px)] min-h-0 flex-col gap-5 px-8 pb-6 pt-5">
        <div className="flex shrink-0 items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.01em]">Model comparison</h1>
            <p className="mt-1 text-sm text-ink-2">
              {imageMode ? "Image-level scores on" : "Box-level scores on"}{" "}
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
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(420px,34%)] gap-5">
              <section className="rw-panel flex min-h-0 min-w-0 flex-col px-6 pb-4 pt-5">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1">
                  <h2 className="text-base font-semibold">
                    {imageMode ? "Did the model find the rip? Scores by metric" : "Scores by metric"}
                  </h2>
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
                  <ResultsChart metrics={metrics} level={imageMode ? "image" : "box"} />
                </div>
              </section>

              {imageMode && baseline ? (
                <div className="flex min-h-0 flex-col gap-5">
                  <section className="rw-panel flex min-h-0 flex-1 flex-col justify-center gap-4 p-6">
                    <h2 className="text-sm text-ink-2">
                      Rips found in <span className="font-mono text-ink">{ripFrames ?? ours.imageLevel!.tp + ours.imageLevel!.fn}</span>{" "}
                      held-out frames
                    </h2>
                    <HeadlineBar
                      label={ours.name}
                      value={ours.imageLevel!.tp}
                      total={ripFrames ?? ours.imageLevel!.tp + ours.imageLevel!.fn}
                      accent
                    />
                    <HeadlineBar
                      label={baseline.name}
                      value={baseline.imageLevel!.tp}
                      total={ripFrames ?? baseline.imageLevel!.tp + baseline.imageLevel!.fn}
                      accent={false}
                    />
                    <p className="border-t border-line pt-3 text-sm leading-relaxed text-ink-2">
                      {precisionLine(ours, baseline)}
                    </p>
                  </section>
                  <section className="rw-panel shrink-0 px-6 py-4">
                    <h2 className="text-sm font-semibold">Stricter test: rip location (box IoU ≥ 0.5)</h2>
                    <table className="mt-2 w-full text-[13px]">
                      <thead>
                        <tr className="text-ink-3">
                          <th className="py-1 text-left font-normal">Model</th>
                          <th className="px-2 py-1 text-right font-normal">F2</th>
                          <th className="px-2 py-1 text-right font-normal">Precision</th>
                          <th className="px-2 py-1 text-right font-normal">Recall</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {[ours, baseline].map((m) => (
                          <tr key={m.name} className={m === ours ? "text-ink" : "text-ink-2"}>
                            <td className="py-1 pr-2 text-left font-sans">{m.name}</td>
                            <td className="px-2 py-1 text-right">{m.f2.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{m.precision.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{m.recall.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </div>
              ) : (
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
              )}
            </div>

            <div className="grid shrink-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
              <section className="rw-panel px-6 py-5">
                <h2 className="text-sm font-semibold">How it was measured</h2>
                {imageMode && baseline && ripFrames !== undefined && noRipFrames !== undefined ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {metrics.heldOutFrames} frames from the held-out RipVIS validation videos ({ripFrames} with a rip,{" "}
                    {noRipFrames} without), never used in training. Image level asks whether a model flags a rip in
                    the frame at all. The baseline is {baseline.name}: one fixed prompt, boxes in its native format.
                    RipWatch keeps detections{conf ? ` at confidence ${conf} or higher` : ""}, a threshold chosen on the
                    dev split, not on these frames. The stricter box test counts a box only if it overlaps a labelled
                    rip with IoU ≥ 0.5.
                  </p>
                ) : (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {metrics.notes || "No measurement notes were provided with these results."}
                  </p>
                )}
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
