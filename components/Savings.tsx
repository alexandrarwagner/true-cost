import { copy } from "@/content/copy";
import { leverById, type LeverId } from "@/lib/core/levers";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { toggledQuery } from "@/lib/ui/levers";
import { DealGrid } from "./DealGrid";
import { SavingsRow } from "./SavingsRow";

const SHOWN = 5;

/**
 * "Saving tips": the levers, each its own re-run of the engine, then the student deals a
 * person has checked. With several on, the page shows one combined scenario, never a sum.
 * Server-safe; the switches need `onToggle`, and without it each row links to the toggled URL.
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
  const toggleHref = (id: LeverId) => `/r?${toggledQuery(response.shareQuery, s.active, id)}`;
  const levers = s.levers.filter((l) => !l.deal);
  const deals = s.levers.filter((l) => l.deal);
  const row = (l: (typeof s.levers)[number]) => (
    <SavingsRow
      key={l.id}
      lever={l}
      response={response}
      on={s.active.includes(l.id)}
      blockedBy={blockedBy(l.id)}
      busy={busy}
      onToggle={onToggle ? toggle : undefined}
      toggleHref={toggleHref(l.id)}
    />
  );
  const first = levers.slice(0, SHOWN);
  const rest = levers.slice(SHOWN);

  return (
    <section id="save" aria-labelledby="savings-heading" className="scroll-mt-24">
      <h2 id="savings-heading" className="display text-3xl sm:text-4xl">
        {t.tipsHeading}
      </h2>
      <p className="mt-2 text-muted">{t.tipsIntro}</p>
      <p role="status" className="mt-2 min-h-5 font-medium">
        {s.active.length > 0 ? t.nowLine(money(now), money(was)) : ""}
      </p>

      <h3 className="mt-6 text-2xl font-semibold">{t.heading}</h3>
      <p className="mt-1 text-sm text-muted">{t.intro}</p>
      <ul className="mt-2 border-b border-line">{first.map(row)}</ul>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer underline underline-offset-4">
            {t.showMore(rest.length)}
          </summary>
          <ul className="mt-2 border-b border-line">{rest.map(row)}</ul>
        </details>
      )}

      {deals.length > 0 && (
        <DealGrid
          deals={deals}
          response={response}
          active={s.active}
          busy={busy}
          onToggle={onToggle ? toggle : undefined}
          shareQuery={response.shareQuery}
        />
      )}
      {!s.deals.schoolChecked && (
        <p className="mt-3 text-sm text-muted">
          {t.deals.notChecked}
          {s.deals.schoolLink && (
            <>
              {" "}
              <a
                href={s.deals.schoolLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t.deals.schoolLink}
                <span className="sr-only"> ({copy.opensInNewTab})</span>
              </a>
            </>
          )}
        </p>
      )}
      {s.uncertainty && !isUsd && (
        <div className="mt-6 rounded-card bg-card p-4 shadow-card">
          <h3 className="font-semibold">{t.uncertainty.heading}</h3>
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
