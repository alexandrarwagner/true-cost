import { copy } from "@/content/copy";
import type { Phase } from "@/lib/core/types";
import { dateFmt, home, homeFromUsd, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

const PHASES: Phase[] = ["pre_arrival", "arrival", "ongoing", "departure"];

export function Timeline({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const rate = e.fx.today?.rate;
  const showHome = rate !== undefined && cur.code !== "USD";
  return (
    <section aria-labelledby="timeline-heading" className="print:break-before-page">
      <h2 id="timeline-heading" className="text-2xl font-semibold">
        {copy.result.timelineHeading}
      </h2>
      {PHASES.map((phase) => {
        const events = e.schedule.filter((ev) => ev.phase === phase);
        if (events.length === 0) return null;
        const usdSum = events.reduce((s, ev) => s + ev.amountUsd + ev.transferFeeUsd, 0);
        return (
          <div key={phase} className="mt-4">
            <h3 className="font-medium">
              {copy.phases[phase]}{" "}
              <span className="font-normal text-muted">
                ({usdFmt(usdSum as never)}
                {showHome ? `, ${home(homeFromUsd(usdSum as never, rate, cur), cur)}` : ""})
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="mt-1 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line-strong">
                    <th scope="col" className="py-1 pr-3">
                      {copy.result.timelineColumns.date}
                    </th>
                    <th scope="col" className="py-1 pr-3">
                      {copy.result.timelineColumns.what}
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right">
                      {copy.result.timelineColumns.usd}
                    </th>
                    {showHome && (
                      <th scope="col" className="py-1 text-right">
                        {copy.result.timelineColumns.home}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const due = (ev.amountUsd + ev.transferFeeUsd) as never;
                    return (
                      <tr key={ev.date} className="border-b border-line align-top">
                        <td className="py-1 pr-3 whitespace-nowrap">{dateFmt(ev.date)}</td>
                        <td className="py-1 pr-3">
                          {ev.itemIds.map((id) => copy.items[id] ?? id).join(", ")}
                          {ev.transferFeeUsd > 0 && (
                            <span className="text-muted"> + {copy.items["transferFees"]}</span>
                          )}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">{usdFmt(due)}</td>
                        {showHome && (
                          <td className="py-1 text-right tabular-nums">
                            {home(homeFromUsd(due, rate, cur), cur)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
