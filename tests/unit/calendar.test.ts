import { describe, expect, it } from "vitest";
import { academicYears, daysBetween, programmeEnd, startDate } from "@/lib/core/calendar";

describe("calendar", () => {
  it("lays out a two-year fall programme", () => {
    const years = academicYears({ year: 2027, season: "fall" }, 2);
    expect(years).toHaveLength(2);
    expect(years[0]?.semesterDates).toEqual(["2027-08-15", "2028-01-15"]);
    expect(years[0]?.livingMonths[0]).toBe("2027-08-01");
    expect(years[0]?.livingMonths).toHaveLength(10);
    expect(years[0]?.summerMonths).toEqual(["2028-06-01", "2028-07-01"]);
    expect(years[1]?.isFinal).toBe(true);
    expect(programmeEnd({ year: 2027, season: "fall" }, 2)).toBe("2029-05-22");
  });
  it("supports spring starts and one-year programmes", () => {
    expect(startDate({ year: 2027, season: "spring" })).toBe("2027-01-10");
    expect(academicYears({ year: 2027, season: "spring" }, 1)).toHaveLength(1);
    expect(daysBetween("2026-10-29", "2027-08-15")).toBe(290);
  });
});
