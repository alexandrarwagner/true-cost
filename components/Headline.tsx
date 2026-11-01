import { copy } from "@/content/copy";
import { usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

/** Under the tree: badges, the dollar total in words, the rate used, and anything that degraded. */
export function Headline({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const fx = e.fx;
  const isUsd = cur.code === "USD";
  const today = fx.today;
  return (
    <section aria-labelledby="headline" className="mx-auto max-w-lg text-center text-sm text-muted">
      <h3 id="headline" className="sr-only">
        {copy.result.aboutHeading}
      </h3>
      {response.example && (
        <p className="mr-2 mb-2 inline-block rounded-pill bg-cat-living px-2 py-0.5 text-xs font-medium tracking-wide text-ink uppercase">
          {copy.hero.exampleBadge}
        </p>
      )}
      {response.demo && (
        <p
          className="mb-2 inline-block rounded-pill border border-line-strong px-2 py-0.5 text-xs tracking-wide uppercase"
          title={copy.result.demoNote}
        >
          {copy.result.demoBadge}
        </p>
      )}
      <p>{copy.result.headlineUsd(usdFmt(e.totals.total))}</p>
      {response.savings && response.savings.active.length > 0 && (
        <p className="mt-1">
          {copy.savings.nowLine(
            usdFmt(e.totals.total),
            usdFmt(response.savings.baselineTotals.total),
          )}
        </p>
      )}
      {today && !isUsd && (
        <p className="mt-1">
          {copy.result.rateLine(`${today.rate} ${cur.code} per USD`, today.date, today.source)}
        </p>
      )}
      {fx.kind === "unsupported" && !isUsd && (
        <p className="mt-1">{copy.fx.unsupported[fx.reasonId]}</p>
      )}
      {cur.rateCaveat && <p className="mt-1">{copy.fx.official_vs_market}</p>}
      {response.degraded.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-left">
          {response.degraded.map((d) => (
            <li key={d}>{copy.result.degraded[d]}</li>
          ))}
        </ul>
      )}
      {response.example && <p className="mt-2">{copy.hero.exampleNote}</p>}
      {response.demo && <p className="mt-2">{copy.result.demoNote}</p>}
    </section>
  );
}
