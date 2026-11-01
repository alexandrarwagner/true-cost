"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { copy } from "@/content/copy";

const SECTIONS = ["breakdown", "where", "fx", "save", "how", "share"] as const;
type SectionId = (typeof SECTIONS)[number];

interface Props {
  /** "₹1.27 crore · 2 years", shown on wide screens. */
  summary: string;
  editHref: string;
  /** The full-calculation page; the Breakdown tab goes there. */
  breakdownHref: string;
}

/**
 * After a result: section links, the total and "Edit", in the header's slot (a portal). The
 * section in view gets the plum pill. Without JavaScript the header keeps its default links.
 */
export function ResultNav({ summary, editHref, breakdownHref }: Props) {
  // The header's slot exists only in the browser; on the server there is nothing to portal into.
  const slot = useSyncExternalStore(
    () => () => {},
    () => document.getElementById("header-slot"),
    () => null,
  );
  const [current, setCurrent] = useState<SectionId>("breakdown");
  const t = copy.nav;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id as SectionId);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  if (!slot) return null;
  return createPortal(
    <nav aria-label={t.label} className="flex w-full min-w-0 items-center justify-end gap-3">
      <ul className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto rounded-pill bg-card p-1 shadow-card">
        {SECTIONS.map((id) => (
          <li key={id} className="shrink-0">
            <a
              href={id === "breakdown" ? breakdownHref : `#${id}`}
              aria-current={current === id ? "true" : undefined}
              className={`inline-block rounded-pill px-3 py-1.5 text-sm whitespace-nowrap ${
                current === id ? "bg-dark text-white" : "hover:bg-page"
              }`}
            >
              {t[id]}
            </a>
          </li>
        ))}
      </ul>
      <p className="hidden shrink-0 text-sm lg:block">
        <span className="font-semibold tabular-nums">{summary}</span>
        <span className="mx-2 text-muted">·</span>
        <a href={editHref} className="underline underline-offset-4">
          {t.edit}
        </a>
      </p>
    </nav>,
    slot,
  );
}
