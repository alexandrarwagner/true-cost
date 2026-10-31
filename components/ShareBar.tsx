"use client";

import { useState } from "react";
import { copy } from "@/content/copy";

export function ShareBar({ shareQuery }: { shareQuery: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/r?${shareQuery}`;
  const btn =
    "border border-neutral-900 bg-white px-3 py-1 text-sm hover:bg-neutral-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";
  return (
    <section
      aria-labelledby="share-heading"
      className="border-t border-neutral-300 pt-4 print:hidden"
    >
      <h3 id="share-heading" className="font-medium">
        {copy.result.share}
      </h3>
      <p className="text-sm text-neutral-700">{copy.result.shareHint}</p>
      <p className="mt-2 flex flex-wrap items-center gap-3">
        <a href={path} className="underline">
          {path.length > 60 ? `${path.slice(0, 60)}…` : path}
        </a>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const url = `${window.location.origin}${path}`;
            void navigator.clipboard
              ?.writeText(url)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? copy.result.copied : copy.result.copyLink}
        </button>
        <button type="button" className={btn} onClick={() => window.print()}>
          {copy.result.print}
        </button>
      </p>
    </section>
  );
}
