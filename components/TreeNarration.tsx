"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";

/** Narrates the staged reveal through one polite status line; final text at once without motion. */
export function TreeNarration({ total, stageMs }: { total: string; stageMs: number }) {
  const t = copy.tree.narrate;
  const [text, setText] = useState(t.done(total));
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The sequence starts on the next tick, so the server-rendered final text is what hydrates.
    const timers = [
      setTimeout(() => setText(t.start), 0),
      setTimeout(() => setText(t.adding), stageMs * 1.5),
      setTimeout(() => setText(t.done(total)), stageMs * 4),
    ];
    return () => timers.forEach(clearTimeout);
  }, [total, stageMs, t]);
  return (
    <p role="status" aria-live="polite" className="mt-2 text-center text-sm text-muted">
      {text}
    </p>
  );
}
