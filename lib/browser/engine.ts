import { copy } from "@/content/copy";
import { COUNTRIES, currencyInfo } from "@/data/countries";
import fxLatest from "@/lib/adapters/mock/fixtures/fx-latest.json";
import { computeEstimate, degreeTotal, type EstimateContext } from "@/lib/core/estimate";
import { formatLakhCrore, formatMoney } from "@/lib/core/format";
import { usd } from "@/lib/core/money";
import type {
  CustomCost,
  Estimate,
  EstimateInput,
  LineItem,
  Minor,
  Source,
} from "@/lib/core/types";
import { encodeShare } from "@/lib/schema/shareEncode";
import { nextTerms } from "@/lib/ui/terms";
import type {
  Context,
  EngineDeps,
  FxData,
  PageEstimate,
  PageInput,
  PageLine,
  PageSchool,
  TPEngine,
} from "./contract";
import { toPageFx } from "./fan";

const MAX_CUSTOM_COSTS = 10;
const dollars = (cents: number) => cents / 100;

/** Rates known before anything loads: the dated fixture, refreshed by ready(). */
function seedRates(): Record<string, number> {
  const out: Record<string, number> = { USD: 1 };
  for (const r of fxLatest.rates as { quote: string; rate: number }[]) out[r.quote] = r.rate;
  return out;
}

function schoolRef(input: PageInput): PageSchool {
  if (typeof input.school === "object") return input.school;
  return { unitId: 0, name: input.school, city: "", state: "", zip: "" };
}

function countryCode(input: PageInput): string {
  const name = input.from.trim().toLowerCase();
  const cur = input.currency.toUpperCase();
  const byName = COUNTRIES.find((c) => c.name.toLowerCase() === name);
  const byCurrency = COUNTRIES.find((c) => c.currency === cur);
  return (byName ?? byCurrency)?.code ?? "ZZ";
}

function toEstimateInput(input: PageInput, today: string, now: Date): EstimateInput {
  const years = Math.min(
    6,
    Math.max(1, Math.round(input.years) || 1),
  ) as EstimateInput["degreeYears"];
  const customCosts: CustomCost[] = (input.extras ?? []).slice(0, MAX_CUSTOM_COSTS).map((e) => ({
    label: e.name.slice(0, 40),
    amountUsd: usd(e.amt),
    frequency: e.freq === "month" ? "monthly" : "one_off",
  }));
  const house = input.overrides?.house;
  const tuitionSource: Source =
    input.tuitionSource === "school"
      ? { id: "scorecard", kind: "school", name: copy.sources.scorecardTuition, date: today }
      : { id: "user", kind: "user", name: copy.sources.yourInput, date: today };
  const term = nextTerms(now)[0] ?? { year: now.getUTCFullYear() + 1, season: "fall" };
  return {
    countryCode: countryCode(input),
    homeCurrency: input.currency.toUpperCase(),
    school: schoolRef(input),
    tuitionPerYearUsd: usd(input.tuitionPerYearUsd),
    tuitionSource,
    degreeYears: years,
    startTerm: term,
    options: {
      ...(customCosts.length > 0 ? { customCosts } : {}),
      ...(house !== undefined && house !== null && house > 0
        ? { housing: { kind: "off_campus", bedrooms: 1, roommates: 0, monthlyRentUsd: usd(house) } }
        : {}),
    },
  };
}

/** The same link the shared page uses, so each card can open its rows on the full calculation. */
function shareQueryFor(e: Estimate): string | null {
  const i = e.input;
  if (i.school.unitId <= 0 || !COUNTRIES.some((c) => c.code === i.countryCode)) return null;
  const options: Record<string, unknown> = {};
  if (i.options.customCosts?.length)
    options.customCosts = i.options.customCosts.map((c) => ({
      label: c.label,
      amount: dollars(c.amountUsd),
      currency: "USD",
      frequency: c.frequency,
    }));
  if (i.options.housing?.monthlyRentUsd !== undefined)
    options.housing = {
      kind: "off_campus",
      bedrooms: 1,
      roommates: 0,
      monthlyRent: dollars(i.options.housing.monthlyRentUsd),
    };
  return encodeShare({
    countryCode: i.countryCode,
    homeCurrency: i.homeCurrency,
    school: i.school,
    tuitionPerYear: dollars(i.tuitionPerYearUsd),
    tuitionSource: i.tuitionSource.kind === "school" ? "school" : "user",
    degreeYears: i.degreeYears,
    startTerm: i.startTerm,
    options,
    levers: [],
  }).toString();
}

function toLine(item: LineItem, years: number): PageLine {
  return {
    id: item.id,
    name: copy.items[item.id] ?? item.id,
    category: item.category,
    amountUsd: dollars(item.amountUsd),
    degreeUsd: dollars(degreeTotal(item, years)),
    frequency: item.frequency,
    phase: item.phase,
    billing: item.billing,
    confidence: item.source.kind,
    source: {
      id: item.source.id,
      name: item.source.name,
      ...(item.source.url ? { url: item.source.url } : {}),
    },
    checkedOn: item.source.date,
    derivation: {
      formula: item.derivation.formula,
      terms: item.derivation.terms.map((t) => ({ label: t.label, value: t.value, unit: t.unit })),
    },
  };
}

function sampleNote(ctx: Context | undefined, school: PageSchool): string {
  const n = copy.engine.note;
  if (ctx?.demo) return n.demo;
  const parts: string[] = [];
  if (ctx?.rent) parts.push(n.rent(ctx.rent.areaName));
  if (ctx?.school) parts.push(n.living(school.name));
  return parts.length > 0 ? parts.join("; ") : n.estimate;
}

function toPage(
  e: Estimate,
  ctx: Context | undefined,
  fx: FxData | undefined,
  input: PageInput,
  today: string,
): PageEstimate {
  const t = e.totals;
  const years = e.input.degreeYears;
  const extras = input.extras ?? [];
  const exM = extras.filter((x) => x.freq === "month").reduce((a, x) => a + x.amt, 0);
  const exO = extras.filter((x) => x.freq === "once").reduce((a, x) => a + x.amt, 0);
  const c = {
    tui: dollars(t.tuition),
    house: dollars(t.housing),
    live: dollars(t.living + t.healthInsurance),
    one: dollars(t.oneOff),
    move: dollars(t.moneyMoving),
  };
  const tot = dollars(t.total);
  const cur = currencyInfo(e.input.homeCurrency);
  const rate = fx?.today?.rate ?? 1;
  const degraded: string[] = [];
  if (!ctx?.school) degraded.push("school");
  if (!ctx?.rent) degraded.push("rent");
  if (e.input.homeCurrency !== "USD" && !fx?.today) degraded.push("fx_today");
  const pageFx =
    e.fx.kind === "replay" && cur ? toPageFx(e.fx, years, today, cur.minorDigits, tot) : null;
  return {
    c,
    tot,
    exM,
    exO,
    o: {
      T: input.tuitionPerYearUsd,
      Y: years,
      rentM: c.house / (12 * years),
      liveM: c.live / (12 * years),
      one: c.one,
      extraOnce: exO,
      extraMonthly: exM,
      move: input.overrides?.move ?? undefined,
      rate,
    },
    fx: pageFx,
    meta: {
      sampleNote: sampleNote(ctx, schoolRef(input)),
      demo: ctx?.demo ?? false,
      degraded,
      currency: e.input.homeCurrency,
      today,
      shareQuery: shareQueryFor(e),
    },
    lines: e.items.map((i) => toLine(i, years)),
  };
}

export function symbol(currency: string): string {
  const info = currencyInfo(currency);
  if (!info) return currency.toUpperCase();
  const parts = new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.currency,
  }).formatToParts(1);
  return parts.find((p) => p.type === "currency")?.value ?? info.currency;
}

export function format(
  units: number,
  currency: string,
  mode: "full" | "big" | "cr" | "short",
): string {
  const info = currencyInfo(currency);
  if (!info) return `${currency.toUpperCase()} ${Math.round(units).toLocaleString("en")}`;
  const minor = Math.round(units * Math.pow(10, info.minorDigits)) as Minor;
  if (mode === "short")
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: info.currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(units);
  if (info.grouping === "indian" && mode !== "full")
    return formatLakhCrore(minor, info.minorDigits, symbol(currency));
  return formatMoney(minor, {
    currency: info.currency,
    locale: info.locale,
    minorDigits: info.minorDigits,
  });
}

export function currencyName(currency: string): string {
  const code = currency.toUpperCase();
  return copy.fx.currencyNames[code] ?? code;
}

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? "";
}

/** The engine behind window.TPEngine; `deps` says where the data comes from. */
export function createEngine(deps: EngineDeps, version: string): TPEngine {
  const now = deps.now ?? (() => new Date());
  const rates = seedRates();
  const contexts = new Map<number, Promise<Context>>();
  const fxs = new Map<string, Promise<FxData>>();
  const loaded = { ctx: new Map<number, Context>(), fx: new Map<string, FxData>() };

  async function ready(input: PageInput): Promise<void> {
    const school = schoolRef(input);
    const cur = input.currency.toUpperCase();
    const jobs: Promise<unknown>[] = [];
    if (school.unitId > 0 && !loaded.ctx.has(school.unitId)) {
      const p = contexts.get(school.unitId) ?? deps.loadContext(school);
      contexts.set(school.unitId, p);
      jobs.push(p.then((c) => loaded.ctx.set(school.unitId, c)));
    }
    if (cur !== "USD" && !loaded.fx.has(cur)) {
      const p = fxs.get(cur) ?? deps.loadFx(cur);
      fxs.set(cur, p);
      jobs.push(
        p.then((f) => {
          loaded.fx.set(cur, f);
          if (f.today) rates[cur] = f.today.rate;
        }),
      );
    }
    await Promise.all(jobs);
  }

  function estimate(input: PageInput): PageEstimate {
    const at = now();
    const today = at.toISOString().slice(0, 10);
    const school = schoolRef(input);
    const cur = input.currency.toUpperCase();
    const ctx = loaded.ctx.get(school.unitId);
    const fx = cur === "USD" ? undefined : loaded.fx.get(cur);
    const info = currencyInfo(cur);
    const estimateCtx: EstimateContext = {
      today,
      ...(ctx?.school ? { school: ctx.school } : {}),
      ...(ctx?.rent ? { rent: ctx.rent } : {}),
      ...(fx?.today && info
        ? { fx: { today: fx.today, history: fx.history, minorDigits: info.minorDigits } }
        : {}),
    };
    const e = computeEstimate(toEstimateInput(input, today, at), estimateCtx);
    return toPage(e, ctx, fx, input, today);
  }

  return {
    version,
    rates: () => rates,
    ready,
    estimate,
    format,
    symbol,
    currencyName,
    countryName,
  };
}
