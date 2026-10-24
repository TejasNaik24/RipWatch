"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "./LogoMark";
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
    <header
      className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel/70 px-8 backdrop-blur"
      style={{ viewTransitionName: "rw-nav" }}
    >
      <div className="flex h-full items-center gap-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <LogoMark size={32} />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">RipWatch</span>
        </Link>
        <nav className="flex h-full items-center gap-1" aria-label="Main">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-full items-center px-3 text-sm font-medium transition-colors duration-150 ${
                  on ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {l.label}
                {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-sea" />}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <span className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full bg-sea" />
          Monitoring
        </span>
        <LiveClock className="text-ink" />
      </div>
    </header>
  );
}
