import { copy } from "@/content/copy";
import { countryByCode } from "@/data/countries";
import type { Category, EstimateOptions } from "@/lib/core/types";
import { dateFmt, home, homeFromUsd, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { BreakdownItem } from "./BreakdownItem";
import { BreakdownMethod } from "./BreakdownMethod";
import { CategoryChip } from "./CategoryChip";

const ORDER: Category[] = [
  "tuition",
  "housing",
  "health_insurance",
  "living",
  "one_off",
  "money_moving",
];

/** The optional details that were set, in the form's own words. */
function optionLines(o: EstimateOptions): string[] {
  const f = copy.form;
  const out: string[] = [];
  if (o.housing) {
    const h = o.housing;
    out.push(h.kind === "on_campus" ? f.onCampus : f.offCampus);
    if (h.kind === "off_campus") {
      out.push(`${h.bedrooms === 0 ? f.studio : `${h.bedrooms} ${f.bedrooms.toLowerCase()}`}`);
      if (h.roommates > 0) out.push(`${h.roommates} ${f.roommates.toLowerCase()}`);
      if (h.twelveMonthLease) out.push(f.twelveMonthLease);
      if (h.lastMonthUpfront) out.push(f.lastMonthUpfront);
      if (h.monthlyRentUsd !== undefined) out.push(`${f.knownRent}: ${usdFmt(h.monthlyRentUsd)}`);
    }
  }
  if (o.scholarshipPerYearUsd) out.push(`${f.scholarship}: ${usdFmt(o.scholarshipPerYearUsd)}`);
  if (o.insurance) out.push(o.insurance.kind === "waiver" ? f.insuranceWaiver : f.insuranceSchool);
  if (o.flights) out.push(`${f.tripsHome}: ${o.flights.tripsHomePerYear}`);
  if (o.transfer)
    out.push(
      `${f.transferMarkup}: ${(o.transfer.markupBps / 100).toFixed(1)}; ${f.transferFee}: ${usdFmt(o.transfer.fixedFeeUsd)}`,
    );
  if (o.payFromUsd) out.push(f.payFromUsd);
  if (o.dependants) out.push(`${f.dependants}: ${o.dependants}`);
  if (o.enrolmentDepositUsd) out.push(`${f.enrolmentDeposit}: ${usdFmt(o.enrolmentDepositUsd)}`);
  if (o.customCosts?.length)
    out.push(`${copy.customCosts.list}: ${o.customCosts.map((c) => c.label).join(", ")}`);
  return out;
}

/** "Your full calculation": every line with its formula, server-rendered, printable. */
export function Breakdown({
  response,
  reportUrl,
  backHref,
  aiEnabled = false,
}: {
  response: EstimateResponse;
  reportUrl: string;
  backHref: string;
  aiEnabled?: boolean;
}) {
  const t = copy.breakdown;
  const { estimate: e, currency: cur } = response;
  const today = e.fx.today;
  const rate = today && cur.code !== "USD" && !e.input.options.payFromUsd ? today.rate : undefined;
  const money = (usd: number) =>
    rate !== undefined
      ? `${home(homeFromUsd(usd as never, rate, cur), cur)} (${usdFmt(usd as never)})`
      : usdFmt(usd as never);
  const totals: Record<Category, number> = {
    tuition: e.totals.tuition,
    housing: e.totals.housing,
    health_insurance: e.totals.healthInsurance,
    living: e.totals.living,
    one_off: e.totals.oneOff,
    money_moving: e.totals.moneyMoving,
  };
  const options = optionLines(e.input.options);
  return (
    <article className="container space-y-10 pt-8">
      <header>
        <h1 className="display text-3xl sm:text-4xl">{t.title}</h1>
        <p className="mt-2 text-muted">{t.intro}</p>
        <p className="mt-2 print:hidden">
          <a href={backHref} className="underline underline-offset-4">
            {t.backToResult}
          </a>
        </p>
        {response.example && (
          <p className="mt-2 inline-block rounded-pill bg-cat-living px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
            {copy.hero.exampleBadge}
          </p>
        )}
      </header>

      <section aria-labelledby="summary-heading" className="rounded-card bg-card p-5 shadow-card">
        <h2 id="summary-heading" className="text-2xl font-semibold">
          {t.summaryHeading}
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">{t.inputs.from}</dt>
          <dd>
            {countryByCode(e.input.countryCode)?.name ?? e.input.countryCode} · {cur.code}
          </dd>
          <dt className="font-semibold">{t.inputs.school}</dt>
          <dd>
            {e.input.school.name}, {e.input.school.city}, {e.input.school.state}
          </dd>
          <dt className="font-semibold">{t.inputs.tuition}</dt>
          <dd>{usdFmt(e.input.tuitionPerYearUsd)}</dd>
          <dt className="font-semibold">{t.inputs.years}</dt>
          <dd>{e.input.degreeYears}</dd>
          <dt className="font-semibold">{t.inputs.start}</dt>
          <dd>
            {e.input.startTerm.season === "fall" ? copy.form.fall : copy.form.spring}{" "}
            {e.input.startTerm.year}
          </dd>
          <dt className="font-semibold">{t.inputs.options}</dt>
          <dd>{options.length > 0 ? options.join("; ") : t.inputs.none}</dd>
        </dl>
        {response.degraded.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-muted">
            {response.degraded.map((d) => (
              <li key={d}>{copy.result.degraded[d]}</li>
            ))}
          </ul>
        )}
        {today && cur.code !== "USD" && (
          <p className="mt-3 text-sm text-muted">
            {t.rateUsed(`${today.rate} ${cur.code} per USD`, dateFmt(today.date), today.source)}
          </p>
        )}
        <p className="mt-2 font-semibold">
          {rate !== undefined
            ? t.totalLine(home(homeFromUsd(e.totals.total, rate, cur), cur), usdFmt(e.totals.total))
            : t.totalUsd(usdFmt(e.totals.total))}
        </p>
      </section>

      {ORDER.map((c, i) => {
        const items = e.items.filter((it) => it.category === c);
        if (items.length === 0 && c !== "money_moving") return null;
        return (
          <section
            key={c}
            id={c}
            aria-labelledby={`${c}-heading`}
            className={`scroll-mt-24 ${i > 0 ? "print:break-before-page" : ""}`}
          >
            <h2
              id={`${c}-heading`}
              className="flex flex-wrap items-center gap-3 text-2xl font-semibold"
            >
              <CategoryChip category={c} />
              <span className="text-base font-normal text-muted">
                {t.subtotal}:{" "}
                <span className="font-semibold text-ink tabular-nums">{money(totals[c])}</span>
              </span>
            </h2>
            {items.length > 0 && (
              <table className="mt-3 block w-full border-collapse text-left sm:table">
                <thead className="sr-only sm:not-sr-only">
                  <tr className="border-b border-line-strong text-sm">
                    <th scope="col" className="py-2 pr-4">
                      {copy.categories[c]}
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      {t.whenPaid}
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      {t.howWorkedOut}
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      {t.amount}
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      {t.confidence}
                    </th>
                    <th scope="col" className="py-2">
                      {t.source}
                    </th>
                  </tr>
                </thead>
                <tbody className="block sm:table-row-group">
                  {items.map((it) => (
                    <BreakdownItem
                      key={it.id}
                      item={it}
                      years={e.input.degreeYears}
                      cur={cur}
                      rate={rate}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <BreakdownMethod response={response} reportUrl={reportUrl} aiEnabled={aiEnabled} />
    </article>
  );
}
