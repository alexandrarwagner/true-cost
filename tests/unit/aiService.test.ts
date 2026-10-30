import { describe, expect, it } from "vitest";
import { mockAi } from "@/lib/adapters/ai/mock";
import { mockSources } from "@/lib/adapters/mock/sources";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { explainInputFrom, matchSchools } from "@/services/ai";
import { runEstimate } from "@/services/estimate";

const letter =
  "Welcome to the 2-year MS program starting Fall 2027. Tuition is $30,500 per year and mandatory fees are $1,200. Estimated living expenses: $18,000. Scholarship: $5,000 per year.";
const ctx = { signal: AbortSignal.timeout(2000), requestId: "t" };

describe("mock AI", () => {
  it("extracts the figures a letter states, each with its quote", async () => {
    const fields = await mockAi.extractLetter(letter, ctx);
    expect(fields?.map((f) => [f.name, f.valueNumber ?? f.valueText])).toEqual([
      ["tuitionPerYear", 30500],
      ["mandatoryFees", 1200],
      ["estimatedLivingCosts", 18000],
      ["scholarshipPerYear", 5000],
      ["programmeLengthYears", 2],
      ["startDate", "Fall 2027"],
    ]);
    for (const f of fields ?? []) expect(letter).toContain(f.quote);
  });
  it("finds nothing in text without figures", async () => {
    expect(
      await mockAi.extractLetter(
        "Dear student, welcome aboard. We look forward to seeing you.",
        ctx,
      ),
    ).toEqual([]);
  });
});

describe("matchSchools", () => {
  it("resolves suggested names through the real search so every result has a UNITID", async () => {
    const r = await matchSchools("nyu", mockAi, mockSources, ctx);
    expect(r.map((s) => s.unitId)).toEqual([193900]);
    expect(await matchSchools("zzzz", mockAi, mockSources, ctx)).toEqual([]);
  });
});

describe("explainInputFrom", () => {
  it("formats the numbers the explanation may use", async () => {
    const req = EstimateRequestSchema.parse({
      countryCode: "IN",
      homeCurrency: "INR",
      school: {
        unitId: 243780,
        name: "Purdue University-Main Campus",
        city: "West Lafayette",
        state: "IN",
        zip: "47907",
      },
      tuitionPerYear: 28794,
      tuitionSource: "school",
      degreeYears: 2,
      startTerm: { year: 2027, season: "fall" },
      options: {},
    });
    const r = await runEstimate(req, mockSources, new Date("2026-10-30T12:00:00Z"));
    const input = explainInputFrom(r);
    expect(input.years).toBe("2 years");
    expect(input.tuitionUsd).toBe("$57,588");
    expect(input.baselineHome).toMatch(/crore|lakh/);
    expect(input.worstPeriod).toMatch(/\d{4} to \w{3} \d{4}/);
  });
});
