import { describe, expect, it } from "vitest";
import { applyLetterFields } from "@/lib/ui/letterApply";
import { nextTerms, termValue } from "@/lib/ui/terms";

const f = (name: string, valueNumber: number | null, valueText: string | null = null) => ({
  name: name as never,
  valueNumber,
  valueText,
  quote: "q",
});

describe("nextTerms", () => {
  it("defaults to the next fall and keeps the coming spring when it is still ahead", () => {
    const late = nextTerms(new Date("2026-10-30T00:00:00Z"));
    expect(late[0]).toEqual({ year: 2027, season: "fall" });
    expect(late.map(termValue)).toContain("2027-spring");
    const early = nextTerms(new Date("2027-03-01T00:00:00Z"));
    expect(early[0]).toEqual({ year: 2027, season: "fall" });
    expect(early.map(termValue)).not.toContain("2027-spring");
  });
});

describe("applyLetterFields", () => {
  const terms = nextTerms(new Date("2026-10-30T00:00:00Z"));
  it("adds mandatory fees to tuition, maps years to the quick pick, and matches a known term", () => {
    const patch = applyLetterFields(
      [
        f("tuitionPerYear", 30500),
        f("mandatoryFees", 1200),
        f("scholarshipPerYear", 5000),
        f("programmeLengthYears", 2),
        f("startDate", null, "Fall 2027"),
      ],
      terms,
    );
    expect(patch).toEqual({
      tuitionDollars: 31700,
      scholarshipDollars: 5000,
      degree: "masters",
      term: { year: 2027, season: "fall" },
    });
  });
  it("uses 'other' for one- and three-year programmes and ignores unknown terms", () => {
    expect(
      applyLetterFields([f("programmeLengthYears", 3), f("startDate", null, "Fall 2035")], terms),
    ).toEqual({ degree: "other", otherYears: 3 });
    expect(applyLetterFields([f("programmeLengthYears", 5)], terms)).toEqual({});
  });
  it("never applies living costs and ignores fees without tuition", () => {
    expect(
      applyLetterFields([f("estimatedLivingCosts", 18000), f("mandatoryFees", 1200)], terms),
    ).toEqual({});
  });
});
