"use client";

import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import { dateFmt, home, homeShort, monthYear } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { WhatIf } from "./WhatIf";

const RangeChart = dynamic(() => import("./RangeChart").then((m) => m.RangeChart), { ssr: false });

const Swatch = ({ kind }: { kind: "today" | "band" | "worst" }) => (
  <span
    aria-hidden="true"
    className={
      kind === "today"
        ? "inline-block h-1 w-6 rounded-pill bg-brand"
        : kind === "band"
          ? "inline-block h-3 w-6 rounded-sm bg-cat-housing"
          : "inline-block h-0 w-6 border-t-2 border-dashed border-chart-worst"
    }
  />
);

/** "If the rupee moves": the past-periods sentence, legend and keep-aside callout beside the chart. */
export function RangeSection({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const fx = e.fx;
  const t = copy.fx;
  const currencyName = t.currencyNames[cur.code] ?? cur.code;
  if (fx.kind !== "replay") {
    if (cur.code === "USD" || fx.reasonId === "pay_from_usd") return null;
    return (
      <section id="fx" aria-labelledby="range-heading" className="scroll-mt-24">
        <h2 id="range-heading" className="display text-3xl sm:text-4xl">
          {t.heading(currencyName)}
        </h2>
        <p className="mt-2">{t.unsupported[fx.reasonId]}</p>
      </section>
    );
  }
  const keepAside = fx.worst10Home - fx.baselineHome;
  return (
    <section id="fx" aria-labelledby="range-heading" className="scroll-mt-24">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div className="min-w-0">
          <h2 id="range-heading" className="display text-3xl sm:text-4xl">
            {t.heading(currencyName)}
          </h2>
          <p className="mt-4 text-xl">
            {t.rangeLine(homeShort(fx.best10Home, cur), homeShort(fx.worst10Home, cur))}
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Swatch kind="today" /> {t.legend.today}
            </li>
            <li className="flex items-center gap-2">
              <Swatch kind="band" /> {t.legend.band}
            </li>
            <li className="flex items-center gap-2">
              <Swatch kind="worst" /> {t.legend.worst}
            </li>
          </ul>
          {keepAside > 0 && (
            <p className="mt-4 rounded-card bg-tint-pink p-4 text-lg">
              {t.keepAside(homeShort(keepAside as never, cur))}
            </p>
          )}
          <p className="mt-4 text-sm text-muted">
            {t.method(e.input.degreeYears, fx.historyFrom.slice(0, 4), fx.windows.length)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {copy.result.rangeSummary(
              homeShort(fx.medianHome, cur),
              homeShort(fx.best10Home, cur),
              homeShort(fx.worst10Home, cur),
            )}{" "}
            {homeShort(fx.worst.totalHome, cur)}{" "}
            {t.likePeriod(monthYear(fx.worst.start), monthYear(fx.worst.end))}.
          </p>
        </div>
        <div className="min-w-0 rounded-card bg-card p-4 shadow-card">
          <h3 className="font-semibold">{t.chartTitle(cur.code)}</h3>
          <div className="mt-2 print:hidden" role="img" aria-label={copy.result.chartLabel}>
            <RangeChart path={fx.path} currency={cur} />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer font-medium">{copy.result.rangeTable}</summary>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line-strong">
                    {Object.values(copy.result.rangeColumns).map((h) => (
                      <th key={h} scope="col" className="py-1 pr-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fx.path.map((p) => (
                    <tr key={p.date} className="border-b border-line">
                      <td className="py-1 pr-3">{dateFmt(p.date)}</td>
                      <td className="py-1 pr-3 tabular-nums">{home(p.baseline, cur)}</td>
                      <td className="py-1 pr-3 tabular-nums">{home(p.best10, cur)}</td>
                      <td className="py-1 pr-3 tabular-nums">{home(p.median, cur)}</td>
                      <td className="py-1 pr-3 tabular-nums">{home(p.worst10, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
      <p className="mt-6">{t.whatYouCanDo}</p>
      <WhatIf response={response} />
    </section>
  );
}
