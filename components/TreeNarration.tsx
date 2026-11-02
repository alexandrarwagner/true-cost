"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";

/** Narrates the staged reveal through one polite status line; final text at once without motion. */
export function TreeNarration({
  total,
  addingAtMs,
  doneAtMs,
}: {
  total: string;
  addingAtMs: number;
  doneAtMs: number;
}) {
  const t = copy.tree.narrate;
  const [text, setText] = useState(t.done(total));
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The sequence starts on the next tick, so the server-rendered final text is what hydrates.
    const timers = [
      setTimeout(() => setText(t.start), 0),
      setTimeout(() => setText(t.adding), addingAtMs),
      setTimeout(() => setText(t.done(total)), doneAtMs),
    ];
    return () => timers.forEach(clearTimeout);
  }, [total, addingAtMs, doneAtMs, t]);
  return (
    <p role="status" aria-live="polite" className="mt-2 text-center text-sm text-muted">
      {text}
    </p>
  );
}
