"use client";

import { useEffect, useRef, useState } from "react";
import { homeShort, usdFmt, type CurrencyDisplay } from "@/lib/ui/format";

/** How to print the figure: data, not a function, so a server component can pass it. */
export type CountUpFormat = { mode: "home-short"; cur: CurrencyDisplay } | { mode: "usd" };

interface Props {
  /** The final amount in minor units (home) or cents (USD). */
  value: number;
  format: CountUpFormat;
  durationMs?: number;
  /** Waits for the total card to land before the first count. */
  delayMs?: number;
}

export function formatCount(value: number, format: CountUpFormat): string {
  return format.mode === "usd" ? usdFmt(value as never) : homeShort(value as never, format.cur);
}

/**
 * Counts up to the figure once, when motion is allowed. A later change (a lever, an added
 * cost) tweens from the figure on screen, not from zero. Without JavaScript, with reduced
 * motion, or if anything fails, the final figure is simply there. Screen readers only ever get
 * the final figure.
 */
export function CountUp({ value, format, durationMs = 1200, delayMs = 0 }: Props) {
  const final = formatCount(value, format);
  // The text while a count runs; null means "show the final figure".
  const [running, setRunning] = useState<string | null>(null);
  const fromRef = useRef(0);
  const firstRef = useRef(true);
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  }, [format]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const first = firstRef.current;
    firstRef.current = false;
    const duration = first ? durationMs : Math.min(durationMs, 600);
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t >= 1) {
        fromRef.current = value;
        setRunning(null);
        return;
      }
      setRunning(formatCount(Math.round(from + (value - from) * eased), formatRef.current));
      frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(
      () => {
        frame = requestAnimationFrame(tick);
      },
      first ? delayMs : 0,
    );
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      fromRef.current = value;
    };
  }, [value, final, durationMs, delayMs]);

  return (
    <>
      <span aria-hidden="true">{running ?? final}</span>
      <span className="sr-only">{final}</span>
    </>
  );
}
