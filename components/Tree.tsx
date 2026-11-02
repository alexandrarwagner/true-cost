import { copy } from "@/content/copy";
import type { Category, Confidence, LineItem } from "@/lib/core/types";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import { degreeTotalOf } from "@/lib/ui/items";
import type { EstimateResponse } from "@/services/estimate";
import { CategoryChip } from "./CategoryChip";
import { ConfidenceMark } from "./ConfidenceMark";
import { CountUp } from "./CountUp";
import { TreeNarration } from "./TreeNarration";

const COSTS: Category[] = ["housing", "health_insurance", "living", "one_off", "money_moving"];

/* The board's timing: tuition card at once, the line draws from 0.2 s, the cost cards land from
   0.9 s at 0.15 s intervals, the total lands at 1.8 s and then counts up. */
const LINE_AT = 0.2;
const CARDS_AT = 0.9;
const CARD_GAP = 0.15;
const TOTAL_AT = 1.8;
const COUNT_MS = 1200;

/** The confidence of a category: that of its biggest line, which is what the figure rests on. */
function leading(items: LineItem[], years: number): { confidence: Confidence; names: string[] } {
  const ranked = [...items].sort((a, b) => degreeTotalOf(b, years) - degreeTotalOf(a, years));
  const confidence = ranked[0]?.source.kind ?? "estimate";
  const names = ranked.slice(0, 2).map((i) => copy.items[i.id] ?? i.id);
  return { confidence, names };
}

const stage = (seconds: number) => ({ "--delay": `${seconds}s` }) as React.CSSProperties;

/**
 * The tuition tree, to the board's sizes: tuition card, branch lines that draw in, five cost
 * cards and the plum total. Stages land one after another; reduced motion shows all at once.
 */
export function Tree({
  response,
  breakdownHref,
}: {
  response: EstimateResponse;
  breakdownHref: string;
}) {
  const { estimate: e, currency: cur } = response;
  const t = copy.tree;
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const money = (usd: number) =>
    inHome ? home(homeFromUsd(usd as never, rate, cur), cur) : usdFmt(usd as never);
  const totals: Record<Category, number> = {
    tuition: e.totals.tuition,
    housing: e.totals.housing,
    health_insurance: e.totals.healthInsurance,
    living: e.totals.living,
    one_off: e.totals.oneOff,
    money_moving: e.totals.moneyMoving,
  };
  const totalShort = inHome
    ? homeShort(homeFromUsd(e.totals.total, rate, cur), cur)
    : usdFmt(e.totals.total);
  const countUp = inHome
    ? {
        value: homeFromUsd(e.totals.total, rate, cur),
        format: { mode: "home-short" as const, cur },
      }
    : { value: e.totals.total, format: { mode: "usd" as const } };

  return (
    <section
      id="breakdown"
      aria-labelledby="tree-heading"
      className="container scroll-mt-24 pt-20 lg:pt-30"
    >
      <h2 id="tree-heading" className="display text-center text-4xl sm:text-display">
        {t.heading}
      </h2>
      <p className="mt-3.5 text-center text-lg text-muted">
        {t.intro(usdFmt(e.input.tuitionPerYearUsd), e.input.degreeYears)}
      </p>
      <TreeNarration
        total={totalShort}
        addingAtMs={CARDS_AT * 1000}
        doneAtMs={TOTAL_AT * 1000 + COUNT_MS}
      />

      <ol className="mt-8 list-none">
        <li className="tree-stage mx-auto w-full max-w-[380px]" style={stage(0)}>
          <div className="flex flex-col items-center gap-1 rounded-[28px] bg-card p-6 text-center shadow-card">
            <p className="flex items-center gap-2 text-[15px] text-muted">
              <ConfidenceMark kind={e.input.tuitionSource.kind} />
              <span>·</span>
              {copy.categories.tuition}
            </p>
            <p className="text-[40px] font-semibold tracking-[-0.03em] tabular-nums sm:text-[50px]">
              <a href={`${breakdownHref}#tuition`} className="hover:underline">
                {money(totals.tuition)}
              </a>
            </p>
          </div>
        </li>
        <li className="tree-stage hidden md:block" style={stage(LINE_AT)} aria-hidden="true">
          <svg
            viewBox="0 0 1200 60"
            preserveAspectRatio="none"
            className="h-14 w-full text-cat-housing"
          >
            <path
              className="draw"
              d="M600 0v20 M120 40h960 M120 40a14 14 0 0 1 14-14 M1080 40a14 14 0 0 0-14-14 M120 26v34 M360 40v20 M600 40v20 M840 40v20 M1080 26v34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </li>
        <li>
          <ul className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-5">
            {COSTS.map((c, i) => {
              const items = e.items.filter((it) => it.category === c);
              const lead = leading(items, e.input.degreeYears);
              const kind: Confidence =
                c === "money_moving"
                  ? e.input.options.transfer
                    ? "user"
                    : "estimate"
                  : lead.confidence;
              return (
                <li
                  key={c}
                  className="tree-stage flex min-w-0 flex-col items-center gap-2.5 rounded-[28px] bg-card px-4 py-5 text-center shadow-card"
                  style={stage(CARDS_AT + i * CARD_GAP)}
                >
                  <CategoryChip category={c} />
                  <p className="max-w-full truncate text-[26px] font-semibold tracking-[-0.03em] tabular-nums xl:text-[30px]">
                    <a href={`${breakdownHref}#${c}`} className="hover:underline">
                      {money(totals[c])}
                    </a>
                  </p>
                  {inHome && (
                    <p className="-mt-1.5 text-sm text-muted tabular-nums">
                      {usdFmt(totals[c] as never)}
                    </p>
                  )}
                  <p className="text-sm text-muted">
                    <ConfidenceMark kind={kind} />
                    {c !== "money_moving" && lead.names.length > 0 && (
                      <span className="block">{lead.names.join(", ")}</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </li>
        <li className="tree-stage hidden md:block" style={stage(LINE_AT)} aria-hidden="true">
          <svg
            viewBox="0 0 1200 48"
            preserveAspectRatio="none"
            className="h-12 w-full text-cat-housing"
          >
            <path
              className="draw"
              d="M120 0v10a14 14 0 0 0 14 14h932a14 14 0 0 0 14-14V0 M360 0v24 M600 0v24 M840 0v24 M600 24v24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </li>
        <li
          className="tree-stage mx-auto mt-4 w-full max-w-[620px] md:mt-0"
          style={stage(TOTAL_AT)}
        >
          <div className="flex flex-col items-center gap-1.5 rounded-[32px] bg-dark px-6 py-7 text-center text-white sm:p-[30px]">
            <p className="text-base text-dark-muted">{t.aboutLabel}</p>
            <p className="text-[52px] leading-none font-semibold tracking-[-0.04em] text-cat-living tabular-nums sm:text-[72px]">
              <CountUp
                value={countUp.value}
                format={countUp.format}
                durationMs={COUNT_MS}
                delayMs={TOTAL_AT * 1000}
              />
            </p>
            <p className="text-[17px] text-dark-muted tabular-nums">
              {inHome
                ? `${money(e.totals.total)} · ${usdFmt(e.totals.total)}`
                : usdFmt(e.totals.total)}
            </p>
            <p className="mt-2.5 inline-flex h-10 items-center rounded-pill bg-cat-housing px-4 text-base font-semibold text-ink">
              {t.hiddenPill(e.totals.hiddenPercentOfTuition)}
            </p>
            <p className="mt-3 print:hidden">
              <a
                href={breakdownHref}
                className="inline-flex h-11 items-center rounded-pill border-[1.5px] border-dark-muted px-5 text-[15px] text-white hover:bg-white/10"
              >
                {copy.breakdown.seeFull}
              </a>
            </p>
          </div>
        </li>
      </ol>

      {(response.example || response.demo) && (
        <p className="mx-auto mt-6 flex max-w-[720px] flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted">
          {response.example && (
            <span className="rounded-pill bg-cat-living px-2.5 py-0.5 text-xs font-medium tracking-wide text-ink uppercase">
              {copy.hero.exampleBadge}
            </span>
          )}
          {response.demo && (
            <span
              className="rounded-pill border border-line-strong px-2.5 py-0.5 text-xs tracking-wide uppercase"
              title={copy.result.demoNote}
            >
              {copy.result.demoBadge}
            </span>
          )}
          <span>{response.example ? copy.hero.exampleNote : copy.result.demoNote}</span>
        </p>
      )}
    </section>
  );
}
