"use client";

import { copy } from "@/content/copy";

interface Props {
  onExample: () => void;
}

/** Before any result: a dashed skeleton of the tuition tree and two ways to get started. */
export function EmptyTree({ onExample }: Props) {
  const t = copy.empty;
  return (
    <section
      aria-labelledby="empty-heading"
      className="mx-auto mt-12 max-w-3xl rounded-card border border-dashed border-dark-muted p-6 text-center sm:p-10"
    >
      <svg
        viewBox="0 0 560 190"
        className="mx-auto mb-6 w-full max-w-md text-dark-muted"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 6"
      >
        <rect x="200" y="10" width="160" height="60" rx="18" />
        <path d="M280 70v30M60 100h440M60 100v20M207 100v20M353 100v20M500 100v20" />
        <rect x="10" y="120" width="100" height="60" rx="16" />
        <rect x="157" y="120" width="100" height="60" rx="16" />
        <rect x="303" y="120" width="100" height="60" rx="16" />
        <rect x="450" y="120" width="100" height="60" rx="16" />
      </svg>
      <h2 id="empty-heading" className="text-2xl font-medium">
        {t.heading}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-muted">{t.body}</p>
      <p className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <a
          href="#estimate"
          className="inline-block rounded-pill bg-dark px-5 py-2.5 font-medium text-white hover:bg-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          {t.enter}
        </a>
        <button type="button" onClick={onExample} className="underline underline-offset-4">
          {t.example}
        </button>
      </p>
    </section>
  );
}
