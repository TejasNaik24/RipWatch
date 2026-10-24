import type { ReactNode } from "react";
import { IconBell, IconCamera, IconFrames, IconModel, IconSmoothing } from "@/components/Icons";
import PageTransition from "@/components/PageTransition";

// Pure CSS animation, no client state: one light sweeps through the five stages.
// Sized for a 1920x1080 screen recording.

const DATASET_LINE = "Trained on RipVIS: 184 videos, 212,328 frames, 10 countries";

interface Stage {
  title: string;
  sub: string;
  accent?: boolean;
  icon: ReactNode;
}

const STAGES: Stage[] = [
  { title: "Beach camera", sub: "A fixed view of the surf zone", icon: <IconCamera size={26} /> },
  { title: "Video frames", sub: "Split into individual frames", icon: <IconFrames size={26} /> },
  {
    title: "RipWatch model",
    sub: "Fine-tuned YOLO11-seg outlines each rip",
    accent: true,
    icon: <IconModel size={26} />,
  },
  { title: "Temporal smoothing", sub: "Holds steady across frames, no flicker", icon: <IconSmoothing size={26} /> },
  { title: "Lifeguard alert", sub: "Advisory only: a person decides", icon: <IconBell size={26} /> },
];

const STEP_SECONDS = 1.6;
const CYCLE_SECONDS = STEP_SECONDS * STAGES.length;

function Connector({ index }: { index: number }) {
  // The packet leaves just as stage `index` lights up.
  const delay = `${index * STEP_SECONDS + STEP_SECONDS * 0.5}s`;
  return (
    <div className="relative flex items-center" aria-hidden>
      <svg className="h-4 w-full overflow-visible" viewBox="0 0 100 16" preserveAspectRatio="none">
        <line
          x1="0"
          y1="8"
          x2="88"
          y2="8"
          stroke="rgba(190,210,235,0.22)"
          strokeWidth="2"
          strokeDasharray="6 6"
          className="rw-dash"
        />
        <path
          d="M86 3l9 5-9 5"
          fill="none"
          stroke="rgba(190,210,235,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="rw-packet absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sea"
        style={{ animationDelay: delay, animationDuration: `${CYCLE_SECONDS}s` }}
      />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <PageTransition>
      <main className="flex h-[calc(100dvh-56px)] flex-col items-center justify-center gap-16 px-12 py-10">
        <header className="text-center">
          <div className="text-sm font-medium text-sea">How it works</div>
          <h1 className="mt-3 text-[40px] font-semibold leading-tight tracking-[-0.02em]">
            From beach camera to lifeguard alert
          </h1>
        </header>

        <section className="grid w-full max-w-[1720px] grid-cols-[1fr_64px_1fr_64px_1fr_64px_1fr_64px_1fr] items-stretch">
          {STAGES.flatMap((s, i) => {
            const node = (
              <div
                key={s.title}
                className={`rw-node relative flex flex-col items-center rounded-xl border px-6 pb-8 pt-10 text-center ${
                  s.accent ? "border-sea/45 bg-sea/6" : "border-line bg-panel"
                }`}
                style={{ animationDelay: `${i * STEP_SECONDS}s`, animationDuration: `${CYCLE_SECONDS}s` }}
              >
                <span className="absolute left-4 top-3 font-mono text-xs text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  className={`mb-5 grid h-14 w-14 place-items-center rounded-full border ${
                    s.accent ? "border-sea/40 bg-sea/10 text-sea" : "border-line-2 bg-raised text-ink-2"
                  }`}
                >
                  {s.icon}
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.01em]">{s.title}</h2>
                <p className="mt-2 text-[15px] leading-snug text-ink-2">{s.sub}</p>
              </div>
            );
            return i < STAGES.length - 1 ? [node, <Connector key={`c${i}`} index={i} />] : [node];
          })}
        </section>

        <footer className="flex items-center gap-3 rounded-full border border-line-2 bg-panel px-6 py-3">
          <IconFrames size={18} className="text-ink-3" />
          <span className="text-lg text-ink-2">{DATASET_LINE}</span>
        </footer>
      </main>
    </PageTransition>
  );
}
