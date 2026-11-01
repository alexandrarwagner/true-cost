import "server-only";
import { countryByCode, currencyInfo } from "@/data/countries";
import type { DataSources } from "@/lib/adapters/types";
import { computeEstimate, type EstimateContext } from "@/lib/core/estimate";
import { usd } from "@/lib/core/money";
import type { Cents, CustomCost, Estimate, EstimateInput, Source } from "@/lib/core/types";
import type { EstimateRequest } from "@/lib/schema/estimate";
import { encodeShare } from "@/lib/schema/share";
import { ValidationError } from "@/lib/server/errors";
import { getEnv } from "@/lib/server/env";
import { dealsFor } from "@/lib/server/deals";
import { log } from "@/lib/server/log";
import { schoolFlags } from "@/lib/server/schoolFlags";
import { withSavings, type SavingsResult } from "./levers";

export type DegradedSource = "school" | "rent" | "fx_today" | "fx_history";

export interface EstimateResponse {
  estimate: Estimate;
  currency: {
    code: string;
    minorDigits: number;
    locale: string;
    grouping: "indian" | "standard";
    rateCaveat?: string;
  };
  demo: boolean;
  /** Sample figures from "See an example first"; shown with a persistent badge. */
  example: boolean;
  /** Sources that failed and were replaced by labelled estimates. */
  degraded: DegradedSource[];
  generatedAt: string;
  shareQuery: string;
  /** Present when SAVINGS_ENABLED. The estimate above already has `savings.active` applied. */
  savings?: SavingsResult;
}

const SOURCE_TIMEOUT_MS = 5000;

export function toEstimateInput(
  req: EstimateRequest,
  today: string,
  rate?: { rate: number; minorDigits: number },
): EstimateInput {
  const o = req.options;
  const customCosts: CustomCost[] = [];
  for (const c of o.customCosts ?? []) {
    if (c.currency === "USD") {
      customCosts.push({ label: c.label, amountUsd: usd(c.amount), frequency: c.frequency });
    } else if (rate) {
      // Entered in the home currency: converted once, here, and the conversion is recorded.
      customCosts.push({
        label: c.label,
        amountUsd: usd(c.amount / rate.rate),
        frequency: c.frequency,
        converted: {
          amountHome: c.amount,
          currency: req.homeCurrency,
          rate: rate.rate,
          date: today,
        },
      });
    }
    // Without today's rate a home-currency amount cannot be converted; the source is already
    // listed as degraded and the item is left out rather than guessed.
  }
  const tuitionSource: Source =
    req.tuitionSource === "school"
      ? {
          id: "scorecard",
          kind: "school",
          name: "School's published tuition (College Scorecard)",
          date: today,
        }
      : { id: "user", kind: "user", name: "Your input", date: today };
  const money = (d: number | undefined): Cents | undefined =>
    d === undefined ? undefined : usd(d);
  return {
    countryCode: req.countryCode,
    homeCurrency: req.homeCurrency,
    school: req.school,
    tuitionPerYearUsd: usd(req.tuitionPerYear),
    tuitionSource,
    degreeYears: req.degreeYears,
    startTerm: req.startTerm,
    options: {
      ...(customCosts.length > 0 ? { customCosts } : {}),
      ...(o.housing
        ? { housing: { ...o.housing, monthlyRentUsd: money(o.housing.monthlyRent) } }
        : {}),
      ...(o.scholarshipPerYear !== undefined
        ? { scholarshipPerYearUsd: usd(o.scholarshipPerYear) }
        : {}),
      ...(o.insurance
        ? {
            insurance: {
              kind: o.insurance.kind,
              premiumPerYearUsd: money(o.insurance.premiumPerYear),
              ownPremiumPerYearUsd: money(o.insurance.ownPremiumPerYear),
            },
          }
        : {}),
      ...(o.flights
        ? {
            flights: {
              tripsHomePerYear: o.flights.tripsHomePerYear,
              oneWayUsd: money(o.flights.oneWay),
            },
          }
        : {}),
      ...(o.transfer
        ? { transfer: { markupBps: o.transfer.markupBps, fixedFeeUsd: usd(o.transfer.fixedFee) } }
        : {}),
      ...(o.transferCadence !== undefined ? { transferCadence: o.transferCadence } : {}),
      ...(o.payFromUsd !== undefined ? { payFromUsd: o.payFromUsd } : {}),
      ...(o.dependants !== undefined ? { dependants: o.dependants } : {}),
      ...(o.enrolmentDeposit !== undefined ? { enrolmentDepositUsd: usd(o.enrolmentDeposit) } : {}),
    },
  };
}

function settled<T>(r: PromiseSettledResult<T>): T | undefined {
  return r.status === "fulfilled" ? r.value : undefined;
}

/**
 * Gather data from every source in parallel, then run the pure engine. A failed or slow
 * source never fails the estimate: its line becomes a labelled estimate and is listed in
 * `degraded`.
 */
export async function runEstimate(
  req: EstimateRequest,
  sources: DataSources,
  now = new Date(),
): Promise<EstimateResponse> {
  const today = now.toISOString().slice(0, 10);
  const country = countryByCode(req.countryCode);
  const cur = currencyInfo(req.homeCurrency);
  if (!country || !cur) throw new ValidationError("country_or_currency");

  const signal = () => AbortSignal.timeout(SOURCE_TIMEOUT_MS);
  const started = Date.now();
  const [school, rent, fxToday, fxHistory] = await Promise.allSettled([
    sources.schools.costs(req.school.unitId, signal()),
    sources.rent.forArea(
      { zip: req.school.zip, state: req.school.state, city: req.school.city },
      signal(),
    ),
    sources.fx.latest(req.homeCurrency, signal()),
    req.homeCurrency === "USD"
      ? Promise.resolve([])
      : sources.fx.history(req.homeCurrency, signal()),
  ]);

  const degraded: DegradedSource[] = [];
  // A source that fails or comes back empty is degraded either way: the line becomes an estimate.
  if (school.status === "rejected" || settled(school) === null) degraded.push("school");
  if (rent.status === "rejected" || settled(rent) === null) degraded.push("rent");
  if (fxToday.status === "rejected" || settled(fxToday) === null) degraded.push("fx_today");
  if (fxHistory.status === "rejected") degraded.push("fx_history");

  const schoolData = settled(school) ?? null;
  const rentData = settled(rent) ?? null;
  const todayRate = settled(fxToday) ?? null;
  const history = settled(fxHistory) ?? [];

  const ctx: EstimateContext = {
    today,
    ...(schoolData ? { school: schoolData.costs } : {}),
    ...(rentData ? { rent: rentData } : {}),
    ...(todayRate ? { fx: { today: todayRate, history, minorDigits: cur.minorDigits } } : {}),
  };
  const input = toEstimateInput(
    req,
    today,
    todayRate ? { rate: todayRate.rate, minorDigits: cur.minorDigits } : undefined,
  );
  const env = getEnv();
  const saved = env.savingsEnabled
    ? withSavings(
        input,
        ctx,
        req.levers,
        schoolFlags(),
        dealsFor(input.school, today),
        env.dealReportUrl,
      )
    : null;
  const estimate = saved ? saved.estimate : computeEstimate(input, ctx);

  log.info("estimate", {
    ms: Date.now() - started,
    degraded: degraded.join(",") || "none",
    fx: estimate.fx.kind,
    demo: sources.demo,
  });

  return {
    estimate,
    currency: {
      code: cur.currency,
      minorDigits: cur.minorDigits,
      locale: cur.locale,
      grouping: cur.grouping,
      ...(country.rateCaveat ? { rateCaveat: country.rateCaveat } : {}),
    },
    demo: sources.demo,
    example: req.example,
    degraded,
    generatedAt: now.toISOString(),
    shareQuery: encodeShare(saved ? { ...req, levers: saved.savings.active } : req).toString(),
    ...(saved ? { savings: saved.savings } : {}),
  };
}
