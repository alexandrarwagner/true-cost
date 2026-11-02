"use client";

import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import { dateFmt, home, homeShort, monthYear } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { InView } from "./InView";

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
      <section
        id="fx"
        aria-labelledby="range-heading"
        className="container mt-20 scroll-mt-24 lg:mt-40"
      >
        <h2 id="range-heading" className="display text-4xl lg:text-[52px]">
          {t.heading(currencyName)}
        </h2>
        <p className="mt-2">{t.unsupported[fx.reasonId]}</p>
      </section>
    );
  }
  const keepAside = fx.worst10Home - fx.baselineHome;
  return (
    <section
      id="fx"
      aria-labelledby="range-heading"
      className="container mt-20 scroll-mt-24 lg:mt-40"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-stretch lg:gap-11">
        <div className="flex min-w-0 flex-col gap-5">
          <h2 id="range-heading" className="display text-4xl lg:text-[52px] lg:leading-[1.04]">
            {t.heading(currencyName)}
          </h2>
          <p className="text-[21px] leading-[1.45]">
            {t.rangeLine(homeShort(fx.best10Home, cur), homeShort(fx.worst10Home, cur))}
          </p>
          <ul className="space-y-2.5 text-[15px]">
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
            <p className="rounded-[20px] bg-tint-pink px-6 py-5 text-[19px] leading-[1.45]">
              {t.keepAside(homeShort(keepAside as never, cur))}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted">
            {t.method(e.input.degreeYears, fx.historyFrom.slice(0, 4), fx.windows.length)}
          </p>
          <p className="text-sm leading-relaxed text-muted">
            {copy.result.rangeSummary(
              homeShort(fx.medianHome, cur),
              homeShort(fx.best10Home, cur),
              homeShort(fx.worst10Home, cur),
            )}{" "}
            {homeShort(fx.worst.totalHome, cur)}{" "}
            {t.likePeriod(monthYear(fx.worst.start), monthYear(fx.worst.end))}. {t.notPrediction}
          </p>
        </div>
        <div className="min-w-0 rounded-[28px] bg-card px-5 pt-5 pb-4 shadow-card sm:px-7 sm:pt-7">
          <h3 className="text-[17px] font-semibold">{t.chartTitle(cur.code)}</h3>
          <div className="mt-2 print:hidden" role="img" aria-label={copy.result.chartLabel}>
            <InView placeholderClassName="h-[260px]">
              <RangeChart path={fx.path} currency={cur} />
            </InView>
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
    </section>
  );
}
