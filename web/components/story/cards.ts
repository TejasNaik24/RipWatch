// Copy for /story, the title and stat sequence recorded for the video's opening and close.
// Only the statistics listed here may appear. Sources are shown on screen under each stat.

/** Placeholder until the teammate's name is filled in. */
export const TEAMMATE_NAME = "[Teammate name]";

/** A number that counts up once each time its card appears. Shown as `pre + number + post`. */
export interface CountSpec {
  pre?: string;
  from: number;
  to: number;
  post?: string;
  /** Thousands separators, e.g. 300,000. */
  group?: boolean;
}

export type Card =
  | { kind: "title"; title: string; subline: string }
  | { kind: "stat"; count: CountSpec; label: string; source: string; eyebrow?: string }
  | { kind: "bridge"; lead: string; before: string; danger: string; after: string }
  | { kind: "closing"; lead: string; turn: string; credit: string; team: string };

export const CARDS: Card[] = [
  { kind: "title", title: "RipWatch", subline: "Seeing the danger swimmers can’t." },
  {
    kind: "stat",
    count: { from: 0, to: 300000, post: "+", group: true },
    label: "drowning deaths worldwide in 2021",
    source: "Source: World Health Organization",
  },
  {
    kind: "stat",
    count: { from: 0, to: 80, post: "%+" },
    label: "of rescues by US surf beach lifeguards involve rip currents",
    source: "Source: United States Lifesaving Association",
  },
  {
    kind: "stat",
    // The "1 in" stays put and the 5 counts up from 1.
    count: { pre: "1 in ", from: 1, to: 5 },
    label: "beachgoers could spot a real rip current in person",
    source: "Source: Muriwai Beach field study, Natural Hazards and Earth System Sciences (2021)",
  },
  {
    kind: "stat",
    eyebrow: "Closer to home",
    count: { from: 0, to: 17 },
    label: "drownings in Lake Erie in 2025",
    source: "According to the Great Lakes Surf Rescue Project",
  },
  {
    kind: "bridge",
    lead: "Rip currents look calm.",
    before: "That’s what makes them ",
    danger: "deadly",
    after: ".",
  },
  {
    kind: "closing",
    lead: "Rip currents are invisible.",
    turn: "Now they don’t have to be.",
    credit: "RipWatch · HackOHI/O 2026",
    team: `Tejas Naik · ${TEAMMATE_NAME}`,
  },
];
