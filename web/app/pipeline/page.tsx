import type { ReactNode } from "react";

// Pure CSS animation, no client state: one light sweeps through the five stages.
// Sized for a 1920x1080 screen recording.

// Dataset line shown under the diagram. Edit here if the numbers change.
const DATASET_LINE = "Trained on RipVIS: 184 expert-annotated videos, 10 countries";

interface Stage {
  title: string;
  sub: string;
  accent?: boolean;
  icon: ReactNode;
}

const ICON = {
  className: "h-16 w-16",
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const STAGES: Stage[] = [
  {
    title: "Beach camera",
    sub: "Fixed view of the surf zone",
    icon: (
      <svg {...ICON}>
        <path d="M8 22h10l4-6h20l4 6h10v26H8z" />
        <circle cx="32" cy="35" r="9" />
        <circle cx="32" cy="35" r="3" />
      </svg>
    ),
  },
  {
    title: "Video frames",
    sub: "Split into individual frames",
    icon: (
      <svg {...ICON}>
        <rect x="6" y="18" width="14" height="28" rx="2" />
        <rect x="25" y="18" width="14" height="28" rx="2" />
        <rect x="44" y="18" width="14" height="28" rx="2" />
        <path d="M6 12h52M6 52h52" strokeDasharray="3 5" />
      </svg>
    ),
  },
  {
    title: "RipWatch model",
    sub: "Fine-tuned YOLO11-seg",
    accent: true,
    icon: (
      <svg {...ICON}>
        <path d="M6 16c8-5 14 5 22 0s14 5 22 0M6 48c8-5 14 5 22 0s14 5 22 0" strokeOpacity="0.5" />
        <path
          d="M26 20c8-4 18 2 20 12s-6 14-14 12-14-4-12-12c0-5 2-9 6-12z"
          stroke="#ff3b3b"
          fill="rgba(255,59,59,0.28)"
        />
      </svg>
    ),
  },
  {
    title: "Temporal smoothing",
    sub: "Steady across frames, no flicker",
    icon: (
      <svg {...ICON}>
        <path d="M6 40l6-14 6 18 6-24 6 20 6-10 6 12 6-8 6 6" strokeOpacity="0.4" />
        <path d="M6 36c10-14 14 6 26-4s16 2 26-6" />
      </svg>
    ),
  },
  {
    title: "Lifeguard alert",
    sub: "Advisory only: a person decides",
    icon: (
      <svg {...ICON}>
        <path d="M32 8c-10 0-16 8-16 18v10l-6 10h44l-6-10V26c0-10-6-18-16-18z" />
        <path d="M26 52a6 6 0 0 0 12 0" />
      </svg>
    ),
  },
];

const STEP_SECONDS = 1.6;
const CYCLE_SECONDS = STEP_SECONDS * STAGES.length;

function Connector({ index }: { index: number }) {
  // The packet leaves just as stage `index` lights up.
  const delay = `${index * STEP_SECONDS + STEP_SECONDS * 0.5}s`;
  return (
    <div className="relative flex items-center" aria-hidden>
      <svg className="h-6 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
        <line
          x1="0"
          y1="12"
          x2="86"
          y2="12"
          stroke="#2a3a52"
          strokeWidth="3"
          strokeDasharray="7 7"
          className="rw-dash"
        />
        <path d="M82 4l14 8-14 8" fill="none" stroke="#2a3a52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="rw-packet absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-alert"
        style={{ animationDelay: delay, animationDuration: `${CYCLE_SECONDS}s` }}
      />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <main className="rw-grid-bg flex flex-1 flex-col justify-center gap-16 px-12 py-10">
      <header className="text-center">
        <div className="font-mono text-sm tracking-[0.35em] text-mute">HOW IT WORKS</div>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">From beach camera to lifeguard alert</h1>
      </header>

      <section className="grid grid-cols-[1fr_80px_1fr_80px_1fr_80px_1fr_80px_1fr] items-stretch">
        {STAGES.flatMap((s, i) => {
          const node = (
            <div
              key={s.title}
              className={`rw-node relative flex flex-col items-center rounded-xl border bg-panel px-5 py-9 text-center ${
                s.accent ? "border-alert/60" : "border-line"
              }`}
              style={{ animationDelay: `${i * STEP_SECONDS}s`, animationDuration: `${CYCLE_SECONDS}s` }}
            >
              <span className="absolute left-4 top-3 font-mono text-sm tracking-widest text-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={`mb-6 grid h-28 w-28 place-items-center rounded-full border ${s.accent ? "border-alert/50 bg-alert/10 text-ink" : "border-line bg-panel2 text-steel"}`}>
                {s.icon}
              </div>
              <h2 className="text-3xl font-semibold leading-tight">{s.title}</h2>
              <p className={`mt-3 text-xl leading-snug ${s.accent ? "text-ink" : "text-mute"}`}>{s.sub}</p>
            </div>
          );
          return i < STAGES.length - 1 ? [node, <Connector key={`c${i}`} index={i} />] : [node];
        })}
      </section>

      <footer className="mx-auto flex items-center gap-4 rounded-lg border border-line bg-panel px-8 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-steel" />
        <span className="text-2xl text-mute">{DATASET_LINE}</span>
      </footer>
    </main>
  );
}
