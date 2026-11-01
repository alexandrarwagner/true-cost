import "server-only";
import { z } from "zod";
import type { SchoolSource, SchoolSummary } from "@/lib/adapters/types";
import { usd } from "@/lib/core/money";
import type { Cents, SchoolCosts, Source } from "@/lib/core/types";
import { TtlCache } from "@/lib/server/cache";
import { readJsonCapped, safeFetch, UpstreamError } from "@/lib/server/http";
import { readSnapshot } from "./snapshotFiles";

// College Scorecard (US Dept. of Education) via api.data.gov. The key travels in a header,
// never in the URL. Search is live and cached; cost fields come from the snapshot first and
// fall back to a live call.

export const SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json";
export const COST_FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.zip",
  "school.degrees_awarded.predominant",
  "latest.cost.tuition.out_of_state",
  "latest.cost.tuition.in_state",
  "latest.cost.roomboard.oncampus",
  "latest.cost.roomboard.offcampus",
  "latest.cost.otherexpense.oncampus",
  "latest.cost.otherexpense.offcampus",
  "latest.cost.booksupply",
] as const;

const Row = z
  .object({
    id: z.number(),
    "school.name": z.string(),
    "school.city": z.string().nullable(),
    "school.state": z.string().nullable(),
    "school.zip": z.string().nullable(),
    "school.degrees_awarded.predominant": z.number().nullable().optional(),
    "latest.cost.tuition.out_of_state": z.number().nullable().optional(),
    "latest.cost.tuition.in_state": z.number().nullable().optional(),
    "latest.cost.roomboard.oncampus": z.number().nullable().optional(),
    "latest.cost.roomboard.offcampus": z.number().nullable().optional(),
    "latest.cost.otherexpense.oncampus": z.number().nullable().optional(),
    "latest.cost.otherexpense.offcampus": z.number().nullable().optional(),
    "latest.cost.booksupply": z.number().nullable().optional(),
  })
  .loose();
export type ScorecardRow = z.infer<typeof Row>;

const ApiResponse = z.object({
  metadata: z.object({ total: z.number(), page: z.number(), per_page: z.number() }),
  results: z.array(Row),
});
export const ScorecardSnapshot = z.object({
  name: z.string(),
  fetchedAt: z.iso.datetime(),
  sourceVersion: z.string(),
  schools: z.array(Row),
});

export function rowToSummary(r: ScorecardRow): SchoolSummary {
  const tuition = r["latest.cost.tuition.out_of_state"];
  const degree = r["school.degrees_awarded.predominant"];
  return {
    unitId: r.id,
    name: r["school.name"],
    city: r["school.city"] ?? "",
    state: r["school.state"] ?? "",
    zip: (r["school.zip"] ?? "").slice(0, 5),
    ...(typeof tuition === "number" ? { tuitionOutOfStateUsd: usd(tuition) } : {}),
    ...(typeof degree === "number" ? { predominantDegree: degree } : {}),
  };
}

export function rowToCosts(r: ScorecardRow, source: Source): SchoolCosts {
  const c = (v: number | null | undefined): Cents | undefined =>
    typeof v === "number" ? usd(v) : undefined;
  const roomBoardOnCampusUsd = c(r["latest.cost.roomboard.oncampus"]);
  const roomBoardOffCampusUsd = c(r["latest.cost.roomboard.offcampus"]);
  const otherExpenseOnCampusUsd = c(r["latest.cost.otherexpense.oncampus"]);
  const otherExpenseOffCampusUsd = c(r["latest.cost.otherexpense.offcampus"]);
  const booksSupplyUsd = c(r["latest.cost.booksupply"]);
  return {
    source,
    ...(roomBoardOnCampusUsd !== undefined ? { roomBoardOnCampusUsd } : {}),
    ...(roomBoardOffCampusUsd !== undefined ? { roomBoardOffCampusUsd } : {}),
    ...(otherExpenseOnCampusUsd !== undefined ? { otherExpenseOnCampusUsd } : {}),
    ...(otherExpenseOffCampusUsd !== undefined ? { otherExpenseOffCampusUsd } : {}),
    ...(booksSupplyUsd !== undefined ? { booksSupplyUsd } : {}),
  };
}

export function scorecardSource(
  apiKey: string | undefined,
  opts: { now?: () => Date } = {},
): SchoolSource {
  const searchCache = new TtlCache<SchoolSummary[]>(5 * 60 * 1000, 500);
  const costsCache = new TtlCache<{ summary: SchoolSummary; costs: SchoolCosts } | null>(
    24 * 60 * 60 * 1000,
    2000,
  );
  const snapshot = () => readSnapshot("scorecard-costs.json", ScorecardSnapshot);

  async function query(
    params: Record<string, string>,
    signal: AbortSignal,
  ): Promise<ScorecardRow[]> {
    if (!apiKey) throw new UpstreamError("blocked_host", "api.data.gov", 401);
    const url = new URL(SCORECARD_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("fields", COST_FIELDS.join(","));
    const res = await safeFetch(url, {
      signal,
      timeoutMs: 4500,
      retryOnce: true,
      headers: { "x-api-key": apiKey, accept: "application/json" },
    });
    if (!res.ok) throw new UpstreamError("http", url.hostname, res.status);
    const parsed = ApiResponse.safeParse(await readJsonCapped(res));
    if (!parsed.success) throw new UpstreamError("http", url.hostname);
    return parsed.data.results;
  }

  return {
    async search(q, signal) {
      const key = q.trim().toLowerCase();
      const hit = searchCache.get(key);
      if (hit) return hit;
      const rows = await query(
        { "school.name": key, per_page: "10", sort: "latest.student.size:desc" },
        signal,
      );
      const out = rows.map(rowToSummary);
      searchCache.set(key, out);
      return out;
    },
    async costs(unitId, signal) {
      const cached = costsCache.get(String(unitId));
      if (cached !== undefined) return cached;
      const snap = snapshot();
      const fromSnap = snap?.schools.find((r) => r.id === unitId);
      let row: ScorecardRow | undefined = fromSnap;
      let source: Source = {
        id: "scorecard",
        kind: "school",
        name: "College Scorecard",
        url: "https://collegescorecard.ed.gov/data/",
        date: snap?.fetchedAt.slice(0, 10) ?? "",
      };
      if (!row) {
        const rows = await query({ id: String(unitId), per_page: "1" }, signal);
        row = rows[0];
        source = { ...source, date: (opts.now?.() ?? new Date()).toISOString().slice(0, 10) };
      }
      const result = row ? { summary: rowToSummary(row), costs: rowToCosts(row, source) } : null;
      costsCache.set(String(unitId), result);
      return result;
    },
  };
}
