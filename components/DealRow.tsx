import { copy } from "@/content/copy";
import type { Deal, Money } from "@/lib/core/deals";
import { costLineOf, savingPerPeriod } from "@/lib/core/deals";
import type { RankedLever } from "@/lib/core/levers";
import { dealReportHref } from "@/lib/ui/dealReport";
import { dateFmt, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

interface Props {
  lever: RankedLever;
  deal: Deal;
  response: EstimateResponse;
  noteId: string;
}

const badge =
  "inline-block border border-neutral-900 px-1.5 py-0.5 text-xs uppercase tracking-wide";

/** Prices are the source's own, to the cent: "$6.99", not the whole-dollar totals format. */
function price(m: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency }).format(
    m.amount / 100,
  );
}

/** The text of a student-deal row: title, saving or why there is none, how to get it, provenance. */
export function DealRow({ lever, deal, response, noteId }: Props) {
  const t = copy.savings.deals;
  const cur = response.currency;
  const savings = response.savings;
  const scope =
    deal.scope === "school"
      ? t.scope.school(response.estimate.input.school.name)
      : deal.scope === "city"
        ? t.scope.city(response.estimate.input.school.city)
        : t.scope.national;
  const perPeriod = savingPerPeriod(deal);
  const noFigure = perPeriod === undefined ? t.noFigure : costLineOf(deal) ? "" : t.noLine;
  const reportUrl = savings?.deals.reportUrl ?? "";
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium">{deal.title}</p>
      <p className="text-sm text-neutral-700">
        <span className={badge}>{t.label}</span> {scope}
      </p>
      {lever.hasFigure ? (
        <p>
          {lever.savingHome !== undefined
            ? copy.savings.saving(homeShort(lever.savingHome, cur), usdFmt(lever.savingUsd))
            : copy.savings.savingUsd(usdFmt(lever.savingUsd))}
        </p>
      ) : (
        <p className="text-neutral-700">{noFigure || copy.savings.tip}</p>
      )}
      {deal.studentPrice && deal.regularPrice && deal.period && (
        <p className="text-sm text-neutral-700">
          {t.prices(
            price(deal.studentPrice),
            price(deal.regularPrice),
            t.period[deal.period] ?? deal.period,
          )}
        </p>
      )}
      <p id={noteId} className="mt-1 text-sm text-neutral-700">
        {deal.howToGet}
      </p>
      <p className="text-sm text-neutral-700">{t.eligibility(deal.eligibility)}</p>
      <p className="mt-1 text-sm text-neutral-700">
        {t.checkedOn(dateFmt(deal.checkedOn))} ·{" "}
        <a href={deal.sourceUrl} rel="noopener noreferrer" className="underline">
          {t.source}
        </a>{" "}
        ·{" "}
        <a
          href={dealReportHref(reportUrl, deal.id, {
            subject: t.reportSubject(deal.id),
            body: t.reportBody(deal.id),
          })}
          rel="noopener noreferrer"
          className="underline"
        >
          {t.ended}
        </a>
      </p>
    </div>
  );
}
