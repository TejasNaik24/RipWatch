"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LiveClock from "./LiveClock";

const LINKS = [
  { href: "/", label: "Command" },
  { href: "/compare", label: "Compare" },
  { href: "/results", label: "Results" },
  { href: "/pipeline", label: "Pipeline" },
];

export default function TopBar() {
  const path = usePathname();
  if (path === "/hook") return null;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-panel px-6">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-alert/50 bg-alert/10">
            <span className="h-2.5 w-2.5 rounded-full bg-alert" />
          </span>
          <span className="text-lg font-semibold tracking-wide">
            RIP<span className="text-alert">WATCH</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-4 py-2 text-sm font-medium tracking-wide transition-colors ${
                  on ? "bg-panel2 text-ink" : "text-mute hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-6 text-sm text-mute">
        <span className="flex items-center gap-2 font-mono text-xs tracking-wider">
          <span className="h-2 w-2 rounded-full bg-ok" /> SYSTEM ONLINE
        </span>
        <LiveClock className="text-ink" />
      </div>
    </header>
  );
}
