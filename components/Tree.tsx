import { copy } from "@/content/copy";
import { degreeTotal } from "@/lib/core/estimate";
import type { Category, Confidence, LineItem } from "@/lib/core/types";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { CategoryChip } from "./CategoryChip";
import { ConfidenceMark } from "./ConfidenceMark";
import { CountUp } from "./CountUp";
import { TreeNarration } from "./TreeNarration";

export const TREE_STAGE_MS = 450;
const COSTS: Category[] = ["housing", "health_insurance", "living", "one_off", "money_moving"];

/** The confidence of a category: that of its biggest line, which is what the figure rests on. */
function leading(items: LineItem[], years: number): { confidence: Confidence; names: string[] } {
  const ranked = [...items].sort((a, b) => degreeTotal(b, years) - degreeTotal(a, years));
  const confidence = ranked[0]?.source.kind ?? "estimate";
  const names = ranked.slice(0, 3).map((i) => copy.items[i.id] ?? i.id);
  return { confidence, names };
}

/**
 * The tuition tree: tuition on top, each hidden cost branching from it, then the total. The
 * stages reveal one after another (globals.css); reduced motion shows everything at once.
 */
export function Tree({ response }: { response: EstimateResponse }) {
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
  const stage = (n: number) => ({ "--stage": n }) as React.CSSProperties;

  return (
    <section id="breakdown" aria-labelledby="tree-heading" className="scroll-mt-24">
      <h2 id="tree-heading" className="display text-center text-3xl sm:text-4xl">
        {t.heading}
      </h2>
      <p className="mt-2 text-center text-muted">
        {t.intro(usdFmt(e.input.tuitionPerYearUsd), e.input.degreeYears)}
      </p>
      <TreeNarration total={totalShort} stageMs={TREE_STAGE_MS} />

      <ol className="mt-6 list-none">
        <li className="tree-stage mx-auto max-w-xs" style={stage(0)}>
          <div className="rounded-card bg-card p-5 text-center shadow-card">
            <p className="text-sm text-muted">
              <ConfidenceMark kind={e.input.tuitionSource.kind} />
              <span className="mx-1">·</span>
              {copy.categories.tuition}
            </p>
            <p className="display mt-1 text-3xl tabular-nums">{money(totals.tuition)}</p>
          </div>
        </li>
        <li className="tree-stage hidden md:block" style={stage(1)} aria-hidden="true">
          <svg
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
            className="h-14 w-full text-cat-housing"
          >
            <path
              d="M500 0v22 M100 36h800 M100 22a14 14 0 0 1 14-14 M900 22a14 14 0 0 0-14-14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M100 22v38 M300 36v24 M500 36v24 M700 36v24 M900 22v38"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </li>
        <li className="tree-stage" style={stage(2)}>
          <ul className="grid gap-3 md:grid-cols-5">
            {COSTS.map((c) => {
              const items = e.items.filter((i) => i.category === c);
              const lead = leading(items, e.input.degreeYears);
              return (
                <li key={c} className="rounded-card bg-card p-4 text-center shadow-card">
                  <CategoryChip category={c} />
                  <p className="display mt-2 text-2xl tabular-nums">{money(totals[c])}</p>
                  {inHome && (
                    <p className="text-sm text-muted tabular-nums">{usdFmt(totals[c] as never)}</p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {c === "money_moving" ? (
                      <ConfidenceMark kind={e.input.options.transfer ? "user" : "estimate"} />
                    ) : (
                      <ConfidenceMark kind={lead.confidence} />
                    )}
                    {c !== "money_moving" && lead.names.length > 0 && (
                      <span className="block">{lead.names.join(", ")}</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </li>
        <li className="tree-stage mx-auto mt-4 max-w-lg" style={stage(3)}>
          <div className="rounded-card-lg bg-dark px-6 py-7 text-center text-white">
            <p className="text-dark-muted">{t.aboutLabel}</p>
            <p className="display mt-1 text-display text-cat-living tabular-nums">
              <CountUp value={countUp.value} format={countUp.format} />
            </p>
            <p className="mt-2 text-dark-muted tabular-nums">
              {inHome
                ? `${money(e.totals.total)} · ${usdFmt(e.totals.total)}`
                : usdFmt(e.totals.total)}
            </p>
            <p className="mt-3 inline-block rounded-pill bg-cat-housing px-3 py-1 text-sm font-semibold text-ink">
              {t.hiddenPill(e.totals.hiddenPercentOfTuition)}
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
