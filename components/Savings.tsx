import { copy } from "@/content/copy";
import { leverById, type LeverId } from "@/lib/core/levers";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { SavingsRow } from "./SavingsRow";

const SHOWN = 5;

/** The `lv` param with one lever toggled, for the no-JavaScript links on the shared page. */
function toggledQuery(shareQuery: string, active: LeverId[], id: LeverId): string {
  const p = new URLSearchParams(shareQuery);
  const next = active.includes(id) ? active.filter((a) => a !== id) : [...active, id];
  if (next.length > 0) p.set("lv", next.join(","));
  else p.delete("lv");
  return p.toString();
}

/**
 * "Ways to lower this number": every lever is its own re-run of the engine. With several on,
 * the page shows one combined scenario, never a sum. Server-safe; the switches need the
 * `onToggle` handler, and without it each row links to the toggled shared URL.
 */
export function Savings({
  response,
  onToggle,
  busy = false,
}: {
  response: EstimateResponse;
  onToggle?: (ids: LeverId[]) => void;
  busy?: boolean;
}) {
  const t = copy.savings;
  const s = response.savings;
  if (!s || s.levers.length === 0) return null;
  const cur = response.currency;
  const rate = response.estimate.fx.today?.rate;
  const isUsd = cur.code === "USD" || response.estimate.input.options.payFromUsd === true;
  const money = (usd: number) =>
    rate && !isUsd
      ? `${home(homeFromUsd(usd as never, rate, cur), cur)} (${usdFmt(usd as never)})`
      : usdFmt(usd as never);
  const now = response.estimate.totals.total;
  const was = s.baselineTotals.total;
  const blockedBy = (id: LeverId): LeverId | undefined =>
    s.active.find((a) => leverById(a)?.excludes.includes(id));
  const toggle = (id: LeverId, on: boolean) =>
    onToggle?.(on ? [...s.active, id] : s.active.filter((a) => a !== id));
  const row = (l: (typeof s.levers)[number]) => (
    <SavingsRow
      key={l.id}
      lever={l}
      response={response}
      on={s.active.includes(l.id)}
      blockedBy={blockedBy(l.id)}
      busy={busy}
      onToggle={onToggle ? toggle : undefined}
      toggleHref={`/r?${toggledQuery(response.shareQuery, s.active, l.id)}`}
    />
  );
  const first = s.levers.slice(0, SHOWN);
  const rest = s.levers.slice(SHOWN);

  return (
    <section aria-labelledby="savings-heading">
      <h3 id="savings-heading" className="text-lg font-semibold">
        {t.heading}
      </h3>
      <p className="mt-1 text-neutral-700">{t.intro}</p>
      <p role="status" className="mt-2 min-h-5 font-medium">
        {s.active.length > 0 ? t.nowLine(money(now), money(was)) : ""}
      </p>
      <ul className="mt-2 border-b border-neutral-300">{first.map(row)}</ul>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer underline">{t.showMore(rest.length)}</summary>
          <ul className="mt-2 border-b border-neutral-300">{rest.map(row)}</ul>
        </details>
      )}
      {s.uncertainty && !isUsd && (
        <div className="mt-6 border border-neutral-300 p-3">
          <h4 className="font-medium">{t.uncertainty.heading}</h4>
          <p className="mt-1">
            {t.uncertainty.body(
              `${homeShort(s.uncertainty.lowHome, cur)} to ${homeShort(s.uncertainty.highHome, cur)}`,
            )}
          </p>
        </div>
      )}
    </section>
  );
}
