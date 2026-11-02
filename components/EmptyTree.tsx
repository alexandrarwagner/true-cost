"use client";

import { copy } from "@/content/copy";

interface Props {
  onExample: () => void;
}

/** Before any result: a dashed skeleton of the tuition tree and two ways to get started. */
export function EmptyTree({ onExample }: Props) {
  const t = copy.empty;
  return (
    <section aria-labelledby="empty-heading" className="container mt-16 text-center">
      <div className="rounded-[32px] bg-card px-6 pt-12 pb-10 sm:px-16 sm:pt-16 sm:pb-14">
        <svg
          viewBox="0 0 560 190"
          className="mx-auto mb-6 w-full max-w-[900px] text-line-strong"
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
        <h2 id="empty-heading" className="display text-3xl sm:text-[44px] sm:leading-[1.05]">
          {t.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-lg leading-[1.55] text-muted">{t.body}</p>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#estimate"
            className="inline-flex h-14 items-center rounded-pill bg-dark px-7 text-[17px] font-semibold text-white hover:bg-ink"
          >
            {t.enter}
          </a>
          <button type="button" onClick={onExample} className="underline underline-offset-4">
            {t.example}
          </button>
        </p>
      </div>
    </section>
  );
}
