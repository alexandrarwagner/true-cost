"use client";

import { useEffect, useState } from "react";
import { homeShort, usdFmt, type CurrencyDisplay } from "@/lib/ui/format";

/** How to print the figure: data, not a function, so a server component can pass it. */
export type CountUpFormat = { mode: "home-short"; cur: CurrencyDisplay } | { mode: "usd" };

interface Props {
  /** The final amount in minor units (home) or cents (USD). */
  value: number;
  format: CountUpFormat;
  durationMs?: number;
}

export function formatCount(value: number, format: CountUpFormat): string {
  return format.mode === "usd" ? usdFmt(value as never) : homeShort(value as never, format.cur);
}

/**
 * Counts up to the final figure when motion is allowed. Without JavaScript, with reduced
 * motion, or if anything fails, the final figure is simply there. Screen readers only ever
 * get the final figure.
 */
export function CountUp({ value, format, durationMs = 1200 }: Props) {
  const final = formatCount(value, format);
  const [shown, setShown] = useState(final);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t >= 1 ? final : formatCount(Math.round(value * eased), format));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, format, final, durationMs]);
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{final}</span>
    </>
  );
}
