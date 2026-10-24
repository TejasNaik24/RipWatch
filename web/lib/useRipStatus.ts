"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection } from "./types";

export interface RipStatus {
  active: boolean;
  /** Peak confidence of the current detection episode. */
  conf: number;
}

const HOLD_MS = 700;

/**
 * Turns per-frame detections into a stable status. State only changes when
 * the status flips (or the peak confidence moves by 5 points), never per frame,
 * and CLEAR is held back briefly so the pill does not flicker.
 */
export function useRipStatus(onChange?: (s: RipStatus, prev: RipStatus) => void) {
  const [status, setStatus] = useState<RipStatus>({ active: false, conf: 0 });
  const cur = useRef(status);
  const lastHit = useRef(0);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });

  const onFrame = useCallback((dets: Detection[]) => {
    const now = performance.now();
    const prev = cur.current;
    let next = prev;
    if (dets.length) {
      lastHit.current = now;
      const top = Math.max(...dets.map((d) => d.conf));
      if (!prev.active) next = { active: true, conf: top };
      else if (Math.abs(top - prev.conf) >= 0.05) next = { active: true, conf: top };
    } else if (prev.active && now - lastHit.current > HOLD_MS) {
      next = { active: false, conf: 0 };
    }
    if (next !== prev) {
      cur.current = next;
      setStatus(next);
      cb.current?.(next, prev);
    }
  }, []);

  /** Drops the status at once (no 0.7 s hold), e.g. when the video it came from is gone. */
  const reset = useCallback(() => {
    const prev = cur.current;
    if (!prev.active) return;
    const next = { active: false, conf: 0 };
    cur.current = next;
    setStatus(next);
    cb.current?.(next, prev);
  }, []);

  return [status, onFrame, reset] as const;
}
