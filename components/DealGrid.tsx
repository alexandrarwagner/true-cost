"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import type { LeverId, RankedLever } from "@/lib/core/levers";
import { monthYear } from "@/lib/ui/format";
import { toggledQuery } from "@/lib/ui/levers";
import type { EstimateResponse } from "@/services/estimate";
import { DealCard } from "./DealCard";

interface Props {
  deals: RankedLever[];
  response: EstimateResponse;
  active: LeverId[];
  busy: boolean;
  onToggle?: (id: LeverId, on: boolean) => void;
  /** For the no-JavaScript links on the shared page. */
  shareQuery: string;
}

/** Student deals as cards with category filter chips. Every card shows without JavaScript. */
export function DealGrid({ deals, response, active, busy, onToggle, shareQuery }: Props) {
  const t = copy.savings.deals;
  const [filter, setFilter] = useState<string>("all");
  const categories = [...new Set(deals.map((d) => d.deal?.category ?? "other"))];
  const shown = deals.filter((d) => filter === "all" || d.deal?.category === filter);
  const latest = deals
    .map((d) => d.deal?.checkedOn ?? "")
    .sort()
    .at(-1);
  const chip = (on: boolean) =>
    `inline-flex h-10 items-center rounded-pill border-[1.5px] px-4 text-[15px] ${on ? "border-dark bg-dark text-white" : "border-line-strong bg-card hover:bg-page"}`;
  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="display text-[30px]">{t.heading}</h3>
        {latest && <p className="text-sm text-muted">{t.checkedLine(monthYear(latest))}</p>}
      </div>
      {categories.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.filterLabel}>
          <button
            type="button"
            className={chip(filter === "all")}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {t.filterAll}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(filter === c)}
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {t.categories[c] ?? c}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="mt-4 text-muted">{t.none}</p>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((l) =>
            l.deal ? (
              <DealCard
                key={l.id}
                lever={l}
                deal={l.deal}
                response={response}
                on={active.includes(l.id)}
                busy={busy}
                onToggle={onToggle}
                toggleHref={`/r?${toggledQuery(shareQuery, active, l.id)}`}
              />
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}
