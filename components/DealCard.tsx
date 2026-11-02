import { copy } from "@/content/copy";
import type { Deal, DealCategory, Money } from "@/lib/core/deals";
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

const TILE: Record<DealCategory, string> = {
  transport: "bg-cat-moving",
  fitness: "bg-cat-living",
  culture: "bg-cat-housing",
  software: "bg-cat-tuition-chip",
  subscriptions: "bg-cat-oneoff",
  phone: "bg-cat-insurance",
  food: "bg-cat-living",
  other: "bg-page",
};

/** A small line icon per category, decorative. */
function Icon({ category }: { category: DealCategory }) {
  const d: Record<DealCategory, string> = {
    transport: "M5 17a2 2 0 1 0 0 .01M19 17a2 2 0 1 0 0 .01M5 17l3-7h8l3 7M8 10l2-4h4",
    fitness: "M4 10v4M20 10v4M7 8v8M17 8v8M7 12h10",
    culture: "M4 20h16M6 20v-8M10 20v-8M14 20v-8M18 20v-8M3 12h18L12 5z",
    software: "M4 6h16v10H4zM8 20h8",
    subscriptions: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z",
    phone: "M7 3h10v18H7zM11 18h2",
    food: "M5 8h12v6a5 5 0 0 1-10 0zM17 10h2a2 2 0 0 1 0 4h-2M5 20h12",
    other: "M4 12h16M12 4v16",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d[category]} />
    </svg>
  );
}

/** Prices are the source's own, to the cent. */
function price(m: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency }).format(
    m.amount / 100,
  );
}

/** One student deal, to the board's card: category tile, the headline figure, the deal, how to get it, the source. */
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
  const headline = lever.hasFigure
    ? lever.savingHome !== undefined
      ? homeShort(lever.savingHome, cur)
      : usdFmt(lever.savingUsd)
    : deal.studentPrice && deal.regularPrice
      ? price(deal.studentPrice)
      : t.free;
  return (
    <li className="flex flex-col gap-2 rounded-[24px] bg-card p-[22px] shadow-card">
      <p className="flex items-center gap-2.5 text-[13px] font-semibold text-muted">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-ink ${TILE[deal.category]}`}
        >
          <Icon category={deal.category} />
        </span>
        {t.categories[deal.category] ?? deal.category}
      </p>
      <p className="display mt-1.5 text-[32px] leading-none">{headline}</p>
      <p className="text-[17px] leading-snug font-semibold">{deal.title}</p>
      <p className="text-sm leading-relaxed text-muted">
        {lever.hasFigure
          ? lever.savingHome !== undefined
            ? copy.savings.saving(homeShort(lever.savingHome, cur), usdFmt(lever.savingUsd))
            : copy.savings.savingUsd(usdFmt(lever.savingUsd))
          : noFigure}
        {deal.studentPrice && deal.regularPrice && deal.period && (
          <span className="block">
            {t.prices(
              price(deal.studentPrice),
              price(deal.regularPrice),
              t.period[deal.period] ?? deal.period,
            )}
          </span>
        )}
      </p>
      <p id={noteId} className="text-sm leading-relaxed">
        {deal.howToGet}
      </p>
      <p className="text-[13px] text-muted">
        {t.eligibility(deal.eligibility)} · {scope}
      </p>
      <p className="mt-auto pt-2 text-[13px] text-muted">
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
