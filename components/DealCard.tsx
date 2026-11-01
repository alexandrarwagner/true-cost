import { copy } from "@/content/copy";
import type { Deal, Money } from "@/lib/core/deals";
import { costLineOf, savingPerPeriod } from "@/lib/core/deals";
import type { LeverId, RankedLever } from "@/lib/core/levers";
import { dealReportHref } from "@/lib/ui/dealReport";
import { dateFmt, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { LeverSwitch } from "./LeverSwitch";

interface Props {
  lever: RankedLever;
  deal: Deal;
  response: EstimateResponse;
  on: boolean;
  busy: boolean;
  onToggle?: (id: LeverId, on: boolean) => void;
  toggleHref: string;
}

/** Prices are the source's own, to the cent. */
function price(m: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency }).format(
    m.amount / 100,
  );
}

/** One student deal: what it is, what it saves if the source states prices, how to get it, and where it came from. */
export function DealCard({ lever, deal, response, on, busy, onToggle, toggleHref }: Props) {
  const t = copy.savings.deals;
  const cur = response.currency;
  const scope =
    deal.scope === "school"
      ? t.scope.school(response.estimate.input.school.name)
      : deal.scope === "city"
        ? t.scope.city(response.estimate.input.school.city)
        : t.scope.national;
  const noFigure =
    savingPerPeriod(deal) === undefined ? t.noFigure : costLineOf(deal) ? "" : t.noLine;
  const reportUrl = response.savings?.deals.reportUrl ?? "";
  const noteId = `deal-${deal.id}-note`;
  return (
    <li className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card">
      <p className="text-xs font-semibold text-muted">
        {t.categories[deal.category] ?? deal.category} · {scope}
      </p>
      <p className="display text-2xl">
        {lever.hasFigure
          ? lever.savingHome !== undefined
            ? homeShort(lever.savingHome, cur)
            : usdFmt(lever.savingUsd)
          : deal.studentPrice && deal.regularPrice
            ? price(deal.studentPrice)
            : t.free}
      </p>
      <p className="font-semibold">{deal.title}</p>
      {lever.hasFigure ? (
        <p className="text-sm text-muted">
          {lever.savingHome !== undefined
            ? copy.savings.saving(homeShort(lever.savingHome, cur), usdFmt(lever.savingUsd))
            : copy.savings.savingUsd(usdFmt(lever.savingUsd))}
        </p>
      ) : (
        <p className="text-sm text-muted">{noFigure}</p>
      )}
      {deal.studentPrice && deal.regularPrice && deal.period && (
        <p className="text-sm text-muted">
          {t.prices(
            price(deal.studentPrice),
            price(deal.regularPrice),
            t.period[deal.period] ?? deal.period,
          )}
        </p>
      )}
      <p id={noteId} className="text-sm">
        {deal.howToGet}
      </p>
      <p className="text-sm text-muted">{t.eligibility(deal.eligibility)}</p>
      <p className="mt-auto pt-2 text-sm text-muted">
        {t.checkedOn(dateFmt(deal.checkedOn))} ·{" "}
        <a
          href={deal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {t.source}
          <span className="sr-only"> ({copy.opensInNewTab})</span>
        </a>{" "}
        ·{" "}
        <a
          href={dealReportHref(reportUrl, deal.id, {
            subject: t.reportSubject(deal.id),
            body: t.reportBody(deal.id),
          })}
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {t.ended}
        </a>
      </p>
      {lever.hasFigure && (
        <div className="pt-1">
          {onToggle ? (
            <LeverSwitch
              id={lever.id}
              on={on}
              disabled={busy}
              describedBy={noteId}
              label={copy.savings.tryIt(deal.title)}
              onChange={(checked) => onToggle(lever.id, checked)}
            />
          ) : (
            <a href={toggleHref} className="underline underline-offset-4">
              {on ? `${copy.savings.tryIt(deal.title)} (on)` : copy.savings.tryIt(deal.title)}
            </a>
          )}
        </div>
      )}
    </li>
  );
}
