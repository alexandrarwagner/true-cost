import { copy } from "@/content/copy";
import { home, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

export function Headline({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const fx = e.fx;
  const isUsd = cur.code === "USD";
  const today = fx.kind === "replay" ? fx.today : fx.today;
  return (
    <section aria-labelledby="headline" className="border-2 border-neutral-900 p-4">
      <h3 id="headline" className="sr-only">
        Headline
      </h3>
      {response.demo && (
        <p
          className="mb-2 inline-block border border-neutral-900 px-2 py-0.5 text-xs uppercase tracking-wide"
          title={copy.result.demoNote}
        >
          {copy.result.demoBadge}
        </p>
      )}
      {fx.kind === "replay" ? (
        <>
          <p className="text-2xl font-semibold">
            {copy.fx.rangeLine(homeShort(fx.best10Home, cur), homeShort(fx.worst10Home, cur))}
          </p>
          <p className="mt-1 text-neutral-700">
            {copy.result.headlineBaseline(home(fx.baselineHome, cur))}
          </p>
        </>
      ) : isUsd ? (
        <p className="text-2xl font-semibold">{copy.result.headlineUsd(usdFmt(e.totals.total))}</p>
      ) : (
        <>
          {fx.baselineHome !== undefined && (
            <p className="text-2xl font-semibold">
              {copy.result.headlineBaseline(home(fx.baselineHome, cur))}
            </p>
          )}
          <p className="mt-1 text-neutral-700">{copy.fx.unsupported[fx.reasonId]}</p>
        </>
      )}
      <p className="mt-2">{copy.result.headlineUsd(usdFmt(e.totals.total))}</p>
      <p className="mt-1 font-medium">{copy.result.hidden(e.totals.hiddenPercentOfTuition)}</p>
      {today && !isUsd && (
        <p className="mt-2 text-sm text-neutral-700">
          {copy.result.rateLine(`${today.rate} ${cur.code} per USD`, today.date, today.source)}
        </p>
      )}
      {cur.rateCaveat && <p className="mt-1 text-sm">{copy.fx.official_vs_market}</p>}
      {response.degraded.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {response.degraded.map((d) => (
            <li key={d}>{copy.result.degraded[d]}</li>
          ))}
        </ul>
      )}
      {response.demo && <p className="mt-2 text-sm text-neutral-700">{copy.result.demoNote}</p>}
    </section>
  );
}
