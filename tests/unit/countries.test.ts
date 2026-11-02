import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COUNTRIES, currencyInfo } from "@/data/countries";
import { CURRENCIES, EstimateRequestSchema } from "@/lib/schema/estimate";

/*
 * The home page lets a student pick any country in its list; every one of them must be a
 * country the engine can calculate in, with a currency Frankfurter provides. The page's list
 * is the designer's (design/wired/typeahead.js); this keeps the two in step.
 */
function pageCountries(): Array<[string, string]> {
  const js = readFileSync("design/wired/typeahead.js", "utf8");
  const m = /const C=(\[\[.*?\]\]);/s.exec(js);
  if (!m) throw new Error("country list not found in typeahead.js");
  return (JSON.parse(m[1] ?? "[]") as [string, string, string][]).map(([n, c]) => [n, c]);
}

describe("the country table", () => {
  it("has every country the home page lists, under the same name and currency", () => {
    const byName = new Map(COUNTRIES.map((c) => [c.name, c]));
    for (const [name, currency] of pageCountries()) {
      const c = byName.get(name);
      expect(c, name).toBeDefined();
      expect(c?.currency, name).toBe(currency);
    }
  });

  it("is well formed: unique codes, ISO-shaped currencies, minor digits per ISO 4217", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    const zero = new Set(["CLP", "ISK", "JPY", "PYG", "UGX", "RWF", "XAF", "XOF", "KRW", "VND"]);
    const three = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.currency).toMatch(/^[A-Z]{3}$/);
      expect(c.locale).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
      const digits = three.has(c.currency) ? 3 : zero.has(c.currency) ? 0 : 2;
      expect(c.minorDigits, c.currency).toBe(digits);
      // Intl knows the currency, so the formatter never falls back to a bare code.
      expect(
        new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency }),
      ).toBeDefined();
    }
  });

  it("feeds the request schema, so a shared link in any of these currencies is valid", () => {
    for (const c of COUNTRIES) {
      expect(CURRENCIES).toContain(c.currency);
      // Shared currencies (euro, CFA franc, US dollar) format with the first country's locale.
      expect(currencyInfo(c.currency)?.minorDigits).toBe(c.minorDigits);
      const r = EstimateRequestSchema.safeParse({
        countryCode: c.code,
        homeCurrency: c.currency,
        school: {
          unitId: 193900,
          name: "New York University",
          city: "New York",
          state: "NY",
          zip: "10012",
        },
        tuitionPerYear: 60_000,
        degreeYears: 2,
        startTerm: { year: 2027, season: "fall" },
        options: {},
      });
      expect(r.success, `${c.code} ${c.currency}`).toBe(true);
    }
  });
});
