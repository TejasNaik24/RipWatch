"use client";

import { useEffect } from "react";

// Marks <html data-input="pointer|keyboard"> by the most recent input. CSS hides the focus
// ring in pointer mode, so a mouse click on a link never leaves a box behind, while keyboard
// users always get the ring. (Browsers' own :focus-visible heuristics differ after a keyboard
// shortcut has been used earlier on the page.)
export default function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (mode: "pointer" | "keyboard") => {
      if (root.dataset.input !== mode) root.dataset.input = mode;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") set("keyboard");
    };
    const onPointer = () => set("pointer");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  return null;
}
