import "server-only";
import { z } from "zod";
import type { RentSource } from "@/lib/adapters/types";
import { usd } from "@/lib/core/money";
import type { AreaRent, Cents, Source } from "@/lib/core/types";
import { TtlCache } from "@/lib/server/cache";
import { readJsonCapped, safeFetch, UpstreamError } from "@/lib/server/http";
import { readSnapshot } from "./snapshotFiles";

// HUD Fair Market Rents. The snapshot (data/snapshots/hud-fmr.json) is built per state by
// scripts/snapshot-hud.ts; a live call to fmr/statedata/{state} is the fallback when a token
// is configured. Areas are matched by the school's city name against metro and county names,
// falling back to a state-wide typical value, which is labelled as such.
//
// The statedata response shape below is read tolerantly: HUD's field names could not be
// verified without an account token (see docs/data-sources.md). Both documented naming
// variants are accepted; anything else parses to "no data" rather than wrong data.

export const HUD_BASE = "https://www.huduser.gov/hudapi/public";
export const HUD_FY = 2027;

const AreaRecord = z
  .object({
    metro_name: z.string().optional(),
    county_name: z.string().optional(),
    town_name: z.string().optional(),
    code: z.string().optional(),
    fips_code: z.string().optional(),
    smallarea_status: z.union([z.string(), z.number()]).optional(),
    Efficiency: z.coerce.number().optional(),
    "One-Bedroom": z.coerce.number().optional(),
    "Two-Bedroom": z.coerce.number().optional(),
    "Three-Bedroom": z.coerce.number().optional(),
    "Four-Bedroom": z.coerce.number().optional(),
  })
  .loose();
type AreaRecord = z.infer<typeof AreaRecord>;

const StateData = z
  .object({
    data: z
      .object({
        metroareas: z.array(AreaRecord).optional(),
        counties: z.array(AreaRecord).optional(),
      })
      .optional(),
    metroareas: z.array(AreaRecord).optional(),
    counties: z.array(AreaRecord).optional(),
  })
  .loose();

export const SnapshotArea = z.object({
  name: z.string(),
  code: z.string(),
  type: z.enum(["metro", "county", "town"]),
  smallArea: z.boolean(),
  monthly: z.object({
    "0": z.number(),
    "1": z.number(),
    "2": z.number(),
    "3": z.number(),
    "4": z.number(),
  }),
});
export type SnapshotArea = z.infer<typeof SnapshotArea>;
export const HudSnapshot = z.object({
  name: z.string(),
  fetchedAt: z.iso.datetime(),
  sourceVersion: z.string(),
  fiscalYear: z.number(),
  byState: z.record(z.string(), z.array(SnapshotArea)),
});

/** Normalise one statedata record into the snapshot shape; null when the rents are missing. */
export function toSnapshotArea(r: AreaRecord, type: SnapshotArea["type"]): SnapshotArea | null {
  const name = r.metro_name ?? r.county_name ?? r.town_name;
  const code = r.code ?? r.fips_code;
  const m = [
    r.Efficiency,
    r["One-Bedroom"],
    r["Two-Bedroom"],
    r["Three-Bedroom"],
    r["Four-Bedroom"],
  ];
  if (!name || !code || m.some((v) => typeof v !== "number" || !(v > 0))) return null;
  return {
    name,
    code,
    type,
    smallArea: String(r.smallarea_status ?? "0") === "1",
    monthly: {
      "0": m[0] as number,
      "1": m[1] as number,
      "2": m[2] as number,
      "3": m[3] as number,
      "4": m[4] as number,
    },
  };
}

export function parseStateData(json: unknown): SnapshotArea[] {
  const parsed = StateData.safeParse(json);
  if (!parsed.success) return [];
  const d = parsed.data;
  const metros = d.data?.metroareas ?? d.metroareas ?? [];
  const counties = d.data?.counties ?? d.counties ?? [];
  return [
    ...metros.map((r) => toSnapshotArea(r, "metro")),
    ...counties.map((r) => toSnapshotArea(r, "county")),
  ].filter((a): a is SnapshotArea => a !== null);
}

export async function fetchStateData(
  state: string,
  token: string,
  signal: AbortSignal,
  year = HUD_FY,
): Promise<SnapshotArea[]> {
  const url = new URL(`${HUD_BASE}/fmr/statedata/${encodeURIComponent(state.toUpperCase())}`);
  url.searchParams.set("year", String(year));
  const res = await safeFetch(url, {
    signal,
    timeoutMs: 4500,
    retryOnce: true,
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) throw new UpstreamError("http", url.hostname, res.status);
  return parseStateData(await readJsonCapped(res));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : Math.round(((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2);
}

/** Pick the area for a city: a metro whose name mentions the city, then any area, then a state-wide typical value. */
export function pickArea(
  areas: SnapshotArea[],
  city: string,
): { area: SnapshotArea; matched: boolean } | null {
  if (areas.length === 0) return null;
  const c = city.trim().toLowerCase();
  const byName = (type?: SnapshotArea["type"]) =>
    areas.find(
      (a) => (!type || a.type === type) && c.length > 0 && a.name.toLowerCase().includes(c),
    );
  const hit = byName("metro") ?? byName();
  if (hit) return { area: hit, matched: true };
  const typical: SnapshotArea = {
    name: "State-wide typical rent (city not matched)",
    code: "state-median",
    type: "county",
    smallArea: false,
    monthly: {
      "0": median(areas.map((a) => a.monthly["0"])),
      "1": median(areas.map((a) => a.monthly["1"])),
      "2": median(areas.map((a) => a.monthly["2"])),
      "3": median(areas.map((a) => a.monthly["3"])),
      "4": median(areas.map((a) => a.monthly["4"])),
    },
  };
  return { area: typical, matched: false };
}

export function hudSource(token: string | undefined): RentSource {
  const liveCache = new TtlCache<SnapshotArea[]>(24 * 60 * 60 * 1000, 60);
  return {
    async forArea({ state, city }) {
      const st = state.toUpperCase();
      const snap = readSnapshot("hud-fmr.json", HudSnapshot);
      let areas = snap?.byState[st];
      let source: Source = {
        kind: "government",
        name: `HUD Fair Market Rents FY${snap?.fiscalYear ?? HUD_FY}`,
        url: "https://www.huduser.gov/portal/datasets/fmr.html",
        date: snap?.fetchedAt.slice(0, 10) ?? "",
      };
      if (!areas || areas.length === 0) {
        if (!token) return null;
        areas = liveCache.get(st) ?? (await fetchStateData(st, token, AbortSignal.timeout(4500)));
        liveCache.set(st, areas);
        source = {
          ...source,
          name: `HUD Fair Market Rents FY${HUD_FY}`,
          date: new Date().toISOString().slice(0, 10),
        };
      }
      const picked = pickArea(areas, city);
      if (!picked) return null;
      const m = picked.area.monthly;
      const rent: AreaRent = {
        monthlyByBedrooms: {
          0: usd(m["0"]) as Cents,
          1: usd(m["1"]),
          2: usd(m["2"]),
          3: usd(m["3"]),
          4: usd(m["4"]),
        },
        areaName: picked.area.name,
        smallArea: picked.area.smallArea,
        source: picked.matched
          ? source
          : { ...source, kind: "estimate", name: `${source.name}, state-wide typical` },
      };
      return rent;
    },
  };
}
