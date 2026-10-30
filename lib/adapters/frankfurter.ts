import "server-only";
import { z } from "zod";
import type { FxSource } from "@/lib/adapters/types";
import type { RatePoint } from "@/lib/core/types";
import { TtlCache } from "@/lib/server/cache";
import { readJsonCapped, safeFetch, UpstreamError } from "@/lib/server/http";
import { readSnapshot } from "./snapshotFiles";

// Exchange rates from Frankfurter's v2 blended feed (see ADR 002). Today's rate is live and
// cached for a few minutes; history comes from a per-currency snapshot and falls back to a
// live range query cached for a day.

export const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";
export const HISTORY_FROM = "2010-01-01";
export const SOURCE_NAME = "Frankfurter blended rates";

const RateRow = z.object({
  date: z.string(),
  base: z.string(),
  quote: z.string(),
  rate: z.number(),
});
const Rows = z.array(RateRow);
export const FxSnapshot = z.object({
  name: z.string(),
  fetchedAt: z.iso.datetime(),
  sourceVersion: z.string(),
  currency: z.string(),
  points: z.array(z.object({ date: z.string(), rate: z.number() })),
});

export async function fetchRates(
  params: Record<string, string>,
  signal: AbortSignal,
  timeoutMs = 4500,
): Promise<RatePoint[]> {
  const url = new URL(FRANKFURTER_URL);
  url.searchParams.set("base", "USD");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await safeFetch(url, {
    signal,
    timeoutMs,
    retryOnce: true,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new UpstreamError("http", url.hostname, res.status);
  const parsed = Rows.safeParse(await readJsonCapped(res, 8 * 1024 * 1024));
  if (!parsed.success) throw new UpstreamError("http", url.hostname);
  return parsed.data.filter((r) => r.rate > 0).map((r) => ({ date: r.date, rate: r.rate }));
}

export function frankfurterSource(): FxSource {
  const latestCache = new TtlCache<RatePoint & { source: string }>(10 * 60 * 1000, 50);
  const historyCache = new TtlCache<RatePoint[]>(24 * 60 * 60 * 1000, 50);
  return {
    async latest(currency, signal) {
      const cur = currency.toUpperCase();
      if (cur === "USD")
        return {
          date: new Date().toISOString().slice(0, 10),
          rate: 1,
          source: "US dollar account",
        };
      const hit = latestCache.get(cur);
      if (hit) return hit;
      const rows = await fetchRates({ quotes: cur }, signal);
      const last = rows.at(-1);
      if (!last) return null;
      const out = { ...last, source: SOURCE_NAME };
      latestCache.set(cur, out);
      return out;
    },
    async history(currency, signal) {
      const cur = currency.toUpperCase();
      if (cur === "USD") return [];
      const snap = readSnapshot(`fx-${cur}.json`, FxSnapshot);
      if (snap && snap.points.length > 0) return snap.points;
      const hit = historyCache.get(cur);
      if (hit) return hit;
      const to = new Date().toISOString().slice(0, 10);
      const rows = await fetchRates({ quotes: cur, from: HISTORY_FROM, to }, signal, 8000);
      historyCache.set(cur, rows);
      return rows;
    },
  };
}
