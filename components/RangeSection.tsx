"use client";

import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import { dateFmt, home, homeShort, monthYear } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { WhatIf } from "./WhatIf";

const RangeChart = dynamic(() => import("./RangeChart").then((m) => m.RangeChart), { ssr: false });

export function RangeSection({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const fx = e.fx;
  if (fx.kind !== "replay") {
    if (cur.code === "USD" || fx.reasonId === "pay_from_usd") return null;
    return (
      <section aria-labelledby="range-heading">
        <h3 id="range-heading" className="text-lg font-semibold">
          {copy.result.rangeHeading}
        </h3>
        <p className="mt-2">{copy.fx.unsupported[fx.reasonId]}</p>
      </section>
    );
  }
  return (
    <section id="fx" aria-labelledby="range-heading" className="scroll-mt-24">
      <h3 id="range-heading" className="text-lg font-semibold">
        {copy.result.rangeHeading}
      </h3>
      <p className="mt-2 text-xl font-medium">
        {copy.fx.rangeLine(homeShort(fx.best10Home, cur), homeShort(fx.worst10Home, cur))}
      </p>
      <p className="mt-2">
        {copy.result.rangeSummary(
          homeShort(fx.medianHome, cur),
          homeShort(fx.best10Home, cur),
          homeShort(fx.worst10Home, cur),
        )}
      </p>
      <p className="mt-1">
        {homeShort(fx.worst.totalHome, cur)}{" "}
        {copy.fx.likePeriod(monthYear(fx.worst.start), monthYear(fx.worst.end))}.
      </p>
      <p className="mt-2 font-medium">{copy.fx.notPrediction}</p>
      <p className="mt-1 text-sm text-neutral-700">
        {copy.result.historyNote(
          fx.historyFrom.slice(0, 4),
          fx.historyTo.slice(0, 4),
          fx.windows.length,
        )}
      </p>

      <div className="mt-4 print:hidden" role="img" aria-label={copy.result.chartLabel}>
        <RangeChart path={fx.path} currency={cur} />
      </div>

      <details className="mt-3 border border-neutral-300 p-3">
        <summary className="cursor-pointer font-medium">{copy.result.rangeTable}</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-900">
                {Object.values(copy.result.rangeColumns).map((h) => (
                  <th key={h} scope="col" className="py-1 pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fx.path.map((p) => (
                <tr key={p.date} className="border-b border-neutral-300">
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

      <p className="mt-3">{copy.fx.whatYouCanDo}</p>
      <WhatIf response={response} />
    </section>
  );
}
