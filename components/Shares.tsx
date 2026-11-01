"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import type { Category } from "@/lib/core/types";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { CATEGORY_BG } from "./CategoryChip";

const ORDER: Category[] = [
  "tuition",
  "housing",
  "health_insurance",
  "living",
  "one_off",
  "money_moving",
];

/**
 * "Where the money goes": each cost's share of the total as a bar list (the default, and the
 * accessible form), or as circles whose area matches the share. Flat fills, no gradients;
 * the name is always printed with the colour.
 */
export function Shares({ response }: { response: EstimateResponse }) {
  const t = copy.shares;
  const { estimate: e, currency: cur } = response;
  const [chart, setChart] = useState(false);
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const totals: Record<Category, number> = {
    tuition: e.totals.tuition,
    housing: e.totals.housing,
    health_insurance: e.totals.healthInsurance,
    living: e.totals.living,
    one_off: e.totals.oneOff,
    money_moving: e.totals.moneyMoving,
  };
  const total = Math.max(1, e.totals.total);
  const rows = ORDER.map((c) => ({
    category: c,
    usd: totals[c],
    pct: Math.round((totals[c] / total) * 100),
    shortLabel: inHome
      ? homeShort(homeFromUsd(totals[c] as never, rate, cur), cur)
      : usdFmt(totals[c] as never),
    fullLabel: inHome
      ? `${home(homeFromUsd(totals[c] as never, rate, cur), cur)} · ${usdFmt(totals[c] as never)}`
      : usdFmt(totals[c] as never),
  })).filter((r) => r.usd > 0);
  const parts = rows.map((r) => `${copy.categories[r.category]} ${r.pct}%`).join(", ");

  return (
    <section
      id="where"
      aria-labelledby="shares-heading"
      className="-mx-4 scroll-mt-24 bg-dark px-4 py-10 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="shares-heading" className="display text-3xl sm:text-4xl">
              {t.heading}
            </h2>
            <p className="mt-2 text-dark-muted">{t.intro}</p>
          </div>
          <button
            type="button"
            aria-pressed={chart}
            onClick={() => setChart((v) => !v)}
            className="rounded-pill border border-dark-muted px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            {chart ? t.seeList : t.seeChart}
          </button>
        </div>

        {chart ? (
          <div
            role="img"
            aria-label={t.chartLabel(parts)}
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            {rows.map((r) => {
              // Area matches the share; the smallest circles are enlarged so their label fits.
              const size = Math.max(96, Math.round(Math.sqrt(r.pct / 100) * 360));
              return (
                <div
                  key={r.category}
                  className={`flex flex-col items-center justify-center rounded-full text-center text-ink shadow-card transition-transform hover:scale-[1.08] focus:scale-[1.08] ${CATEGORY_BG[r.category]}`}
                  style={{ width: size, height: size }}
                  tabIndex={0}
                >
                  <span className="display text-xl tabular-nums sm:text-2xl">{r.shortLabel}</span>
                  <span className="px-2 text-xs sm:text-sm">
                    {copy.categories[r.category]} · {r.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map((r) => (
              <li key={r.category}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="font-semibold">{copy.categories[r.category]}</span>
                  <span className="text-sm text-dark-muted tabular-nums">{r.fullLabel}</span>
                </div>
                <div className="mt-1 h-3 w-full rounded-pill bg-white/10">
                  <div
                    className={`h-3 rounded-pill ${CATEGORY_BG[r.category]}`}
                    style={{ width: `${Math.max(1, r.pct)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-dark-muted">{t.share(r.pct)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
