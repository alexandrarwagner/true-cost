"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import type { Category } from "@/lib/core/types";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { CATEGORY_BG } from "./CategoryChip";
import { Wordmark } from "./Wordmark";

const ORDER: Category[] = [
  "tuition",
  "housing",
  "health_insurance",
  "living",
  "one_off",
  "money_moving",
];

/** "Share it with your family": the plum band with the PDF and print buttons, the link, and a tilted preview of the sheet. */
export function ShareBand({
  response,
  shareQuery,
}: {
  response: EstimateResponse;
  shareQuery: string;
}) {
  const t = copy.result;
  const s = copy.share;
  const { estimate: e, currency: cur } = response;
  const [copied, setCopied] = useState(false);
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const money = (usd: number) =>
    inHome ? home(homeFromUsd(usd as never, rate, cur), cur) : usdFmt(usd as never);
  const totals: Record<Category, number> = {
    tuition: e.totals.tuition,
    housing: e.totals.housing,
    health_insurance: e.totals.healthInsurance,
    living: e.totals.living,
    one_off: e.totals.oneOff,
    money_moving: e.totals.moneyMoving,
  };
  const path = `/r?${shareQuery}`;
  const pill =
    "inline-flex h-14 items-center gap-2.5 rounded-pill px-7 text-[17px] sm:h-16 sm:text-lg";
  return (
    <section
      id="share"
      aria-labelledby="share-heading"
      className="band mt-20 scroll-mt-24 bg-dark text-white lg:mt-40"
    >
      <div className="container grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-20 lg:py-[110px]">
        <div className="flex flex-col gap-5">
          <h2 id="share-heading" className="display text-4xl sm:text-display lg:text-display-lg">
            {s.heading}
          </h2>
          <p className="max-w-[560px] text-lg leading-relaxed text-dark-muted">{s.body}</p>
          <div className="mt-2 flex flex-wrap gap-3.5 print:hidden">
            <button
              type="button"
              className={`${pill} bg-cat-living font-semibold text-ink hover:brightness-95`}
              onClick={() => window.print()}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />
              </svg>
              {s.pdf}
            </button>
            <button
              type="button"
              className={`${pill} border-[1.5px] border-white text-white hover:bg-white/10`}
              onClick={() => window.print()}
            >
              {t.print}
            </button>
            <button
              type="button"
              className={`${pill} text-dark-muted underline-offset-4 hover:underline`}
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}${path}`).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? t.copied : t.copyLink}
            </button>
          </div>
          <p className="text-[15px] text-dark-muted">{s.note}</p>
          <p className="text-[15px] text-dark-muted">
            <a href={path} className="break-all underline underline-offset-4">
              {path}
            </a>
          </p>
        </div>
        <div className="relative mx-auto hidden h-[560px] w-[460px] lg:block" aria-hidden="true">
          <span className="absolute top-[34px] left-[44px] h-[520px] w-[380px] rotate-[5deg] rounded-[10px] bg-white opacity-[0.18]" />
          <div className="absolute top-[14px] left-[24px] flex h-[520px] w-[380px] -rotate-3 flex-col gap-2.5 rounded-[10px] bg-white p-[26px] text-ink shadow-sheet">
            <Wordmark className="text-base" />
            <p className="text-[11px] text-muted">
              {s.sheetSubtitle(e.input.degreeYears, cur.code)}
            </p>
            <p className="display mt-1.5 text-[40px] leading-none tabular-nums">
              {inHome
                ? homeShort(homeFromUsd(e.totals.total, rate, cur), cur)
                : usdFmt(e.totals.total)}
            </p>
            <p className="text-[11px] text-muted tabular-nums">
              {inHome
                ? `${money(e.totals.total)} · ${usdFmt(e.totals.total)}`
                : usdFmt(e.totals.total)}
            </p>
            <div className="my-1 flex h-2.5 gap-0.5">
              {ORDER.filter((c) => totals[c] > 0).map((c) => (
                <span
                  key={c}
                  className={`rounded-[5px] ${CATEGORY_BG[c]}`}
                  style={{
                    flex: Math.max(1, Math.round((totals[c] / Math.max(1, e.totals.total)) * 100)),
                  }}
                />
              ))}
            </div>
            <ul className="text-[11px]">
              {ORDER.filter((c) => totals[c] > 0).map((c) => (
                <li
                  key={c}
                  className="flex items-center justify-between border-t border-line py-1.5 first:border-t-0"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${CATEGORY_BG[c]}`} />
                    {copy.categories[c]}
                  </span>
                  <span className="font-semibold tabular-nums">{money(totals[c])}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-[10px] leading-snug text-muted">{s.sheetFooter}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
