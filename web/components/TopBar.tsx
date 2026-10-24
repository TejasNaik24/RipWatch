"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  // The menu below 1024px. Open for one path only, so it closes by itself on navigation.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuOpen = openFor === path;
  if (path === "/hook") return null;
  return (
    <header
      className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel/70 px-8 backdrop-blur max-lg:px-4"
      style={{ viewTransitionName: "rw-nav" }}
    >
      <div className="flex h-full items-center gap-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-md max-lg:min-h-11">
          <LogoMark size={32} />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">RipWatch</span>
        </Link>
        <nav className="flex h-full items-center gap-1 max-lg:hidden" aria-label="Main">
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
      <div className="flex items-center gap-6 text-sm max-lg:gap-3">
        <span className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full bg-sea" />
          Monitoring
        </span>
        <LiveClock className="text-ink max-lg:hidden" />
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setOpenFor(menuOpen ? null : path)}
          className="grid h-11 w-11 place-items-center rounded-md border border-line-2 bg-raised text-ink lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <nav
          className="absolute inset-x-0 top-full flex flex-col border-b border-line bg-panel px-4 pb-3 pt-1 shadow-lg lg:hidden"
          aria-label="Main"
        >
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-12 items-center rounded-md px-3 text-base font-medium ${
                  on ? "bg-raised text-ink" : "text-ink-2"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
