import type { ExplainInput } from "@/lib/adapters/ai/types";
import type { EstimateResponse } from "@/services/estimate";
import { home, homeShort, monthYear, usdFmt } from "./format";

/** Client-safe twin of services/ai explainInputFrom, so the template renders without a round trip. */
export function explainInputFromClient(r: EstimateResponse): ExplainInput {
  const e = r.estimate;
  const fx = e.fx;
  const years = e.input.degreeYears;
  return {
    school: e.input.school.name,
    currency: r.currency.code,
    years: `${years} ${years === 1 ? "year" : "years"}`,
    totalUsd: usdFmt(e.totals.total),
    tuitionUsd: usdFmt(e.totals.tuition),
    hiddenPercent: `${e.totals.hiddenPercentOfTuition}%`,
    baselineHome:
      fx.kind === "replay"
        ? homeShort(fx.baselineHome, r.currency)
        : fx.baselineHome !== undefined && r.currency.code !== "USD"
          ? home(fx.baselineHome, r.currency)
          : null,
    best10Home: fx.kind === "replay" ? homeShort(fx.best10Home, r.currency) : null,
    worst10Home: fx.kind === "replay" ? homeShort(fx.worst10Home, r.currency) : null,
    worstPeriod:
      fx.kind === "replay" ? `${monthYear(fx.worst.start)} to ${monthYear(fx.worst.end)}` : null,
  };
}
