import { copy } from "@/content/copy";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { CompareResponse } from "@/services/compare";
import type { EstimateResponse } from "@/services/estimate";
import { ResultView } from "./ResultView";

type Cell = (col: EstimateResponse) => string;

// Side by side (step 8). Server-safe and static: a table, then the first school's full result.
export function CompareView({ response }: { response: CompareResponse }) {
  const t = copy.compare;
  const { columns, currency: cur } = response;
  const isUsd = cur.code === "USD";
  const lowest = Math.min(...columns.map((c) => c.estimate.totals.total));
  const atToday: Cell = (c) => {
    const rate = c.estimate.fx.today?.rate;
    return rate ? home(homeFromUsd(c.estimate.totals.total, rate, cur), cur) : t.rangeUnavailable;
  };
  const range: Cell = (c) =>
    c.estimate.fx.kind === "replay"
      ? `${homeShort(c.estimate.fx.best10Home, cur)} – ${homeShort(c.estimate.fx.worst10Home, cur)}`
      : t.rangeUnavailable;
  const rows: Array<[keyof typeof t.rows, Cell, boolean?]> = [
    ["tuitionPerYear", (c) => usdFmt(c.estimate.input.tuitionPerYearUsd)],
    ["total", (c) => usdFmt(c.estimate.totals.total), true],
    ...(isUsd
      ? []
      : ([
          ["today", atToday],
          ["range", range],
        ] as Array<[keyof typeof t.rows, Cell]>)),
    ["hidden", (c) => `${c.estimate.totals.hiddenPercentOfTuition}%`],
    ["housing", (c) => usdFmt(c.estimate.totals.housing)],
    ["healthInsurance", (c) => usdFmt(c.estimate.totals.healthInsurance)],
    ["living", (c) => usdFmt(c.estimate.totals.living)],
    ["oneOff", (c) => usdFmt(c.estimate.totals.oneOff)],
    ["moneyMoving", (c) => usdFmt(c.estimate.totals.moneyMoving)],
  ];
  const primary = columns[0];
  const notes = columns.flatMap((c) =>
    c.degraded.map((d) => t.columnNote(c.estimate.input.school.name, copy.result.degraded[d])),
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-xl font-semibold">
          {t.heading}
        </h2>
        <p className="mt-1 text-neutral-700">{t.intro}</p>
        <div className="mt-3 overflow-x-auto" role="region" aria-label={t.scrollHint} tabIndex={0}>
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-neutral-900 align-bottom">
                <th scope="col" className="py-2 pr-4 font-normal">
                  <span className="sr-only">{copy.form.school}</span>
                </th>
                {columns.map((c) => (
                  <th key={c.estimate.input.school.unitId} scope="col" className="py-2 pr-4">
                    <a href={`/r?${c.shareQuery}`} className="underline">
                      {c.estimate.input.school.name}
                    </a>
                    <span className="block text-sm font-normal text-neutral-700">
                      {c.estimate.input.school.city}, {c.estimate.input.school.state}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, cell, isTotal]) => (
                <tr
                  key={key}
                  className={`border-t border-neutral-300 ${isTotal ? "font-semibold" : ""}`}
                >
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {t.rows[key]}
                  </th>
                  {columns.map((c) => (
                    <td
                      key={c.estimate.input.school.unitId}
                      className="py-2 pr-4 text-right tabular-nums"
                    >
                      {cell(c)}
                      {isTotal && c.estimate.totals.total === lowest && (
                        <span className="ml-2 inline-block border border-neutral-900 px-1 text-xs font-normal uppercase tracking-wide">
                          {t.lowest}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isUsd && <p className="mt-2 text-sm text-neutral-700">{copy.fx.notPrediction}</p>}
        {notes.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>
      {primary && (
        <ResultView
          response={primary}
          heading={t.fullResult(primary.estimate.input.school.name)}
          shareQuery={response.shareQuery}
        />
      )}
    </div>
  );
}
