import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isShowable, type Deal } from "@/lib/core/deals";
import type { IsoDate, SchoolRef } from "@/lib/core/types";
import {
  CityDealsFileSchema,
  NationalDealsFileSchema,
  SchoolDealsFileSchema,
  SchoolLinksSchema,
} from "@/lib/schema/deals";

// Reads the hand-approved deal files once. Only `approved` deals checked within the last
// 90 days ever reach a page; everything under data/deals/review is the research script's
// output and is never read here (ADR 014).

const ROOT = join(process.cwd(), "data", "deals");

export interface DealFiles {
  schools: Array<{ file: string; unitId: number; school: string; deals: Deal[] }>;
  cities: Array<{ file: string; city: string; state: string; deals: Deal[] }>;
  national: Deal[];
}

export interface DealsForSchool {
  deals: Deal[];
  /** False when no file exists for the school, so the page can say so. */
  schoolChecked: boolean;
  /** The school's own discounts page from data/school-links.json, if the owner added one. */
  schoolLink?: string;
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const jsonFiles = (dir: string): string[] => {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
};

/** Every deal file parsed and validated; throws on the first bad file. Not cached. */
export function readDealFiles(root = ROOT): DealFiles {
  const schools = jsonFiles(join(root, "schools")).map((file) => ({
    file,
    ...SchoolDealsFileSchema.parse(readJson(file)),
  }));
  const cities = jsonFiles(join(root, "city")).map((file) => ({
    file,
    ...CityDealsFileSchema.parse(readJson(file)),
  }));
  const nationalFile = join(root, "national.json");
  const national = jsonFiles(root).includes(nationalFile)
    ? NationalDealsFileSchema.parse(readJson(nationalFile)).deals
    : [];
  for (const f of [...schools, ...cities])
    for (const d of f.deals)
      if (d.scope !== (f.file.includes("/schools/") ? "school" : "city"))
        throw new Error(`${f.file}: deal "${d.id}" has scope "${d.scope}" for this folder`);
  for (const d of national)
    if (d.scope !== "national") throw new Error(`national.json: deal "${d.id}" is not national`);
  return { schools, cities, national };
}

let filesCache: DealFiles | undefined;
let linksCache: Record<string, { url: string }> | undefined;

function files(): DealFiles {
  filesCache ??= readDealFiles();
  return filesCache;
}

function links(): Record<string, { url: string }> {
  linksCache ??= SchoolLinksSchema.parse(
    readJson(join(process.cwd(), "data", "school-links.json")),
  );
  return linksCache;
}

const sameCity = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Approved, fresh deals for the school, its city and the country, in that order. */
export function dealsFor(school: SchoolRef, today: IsoDate): DealsForSchool {
  const all = files();
  const own = all.schools.find((s) => s.unitId === school.unitId);
  const city = all.cities.filter(
    (c) => sameCity(c.city, school.city) && c.state.toUpperCase() === school.state.toUpperCase(),
  );
  const deals = [...(own?.deals ?? []), ...city.flatMap((c) => c.deals), ...all.national].filter(
    (d) => isShowable(d, today),
  );
  const link = links()[String(school.unitId)]?.url;
  return { deals, schoolChecked: own !== undefined, ...(link ? { schoolLink: link } : {}) };
}
