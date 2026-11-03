import { describe, expect, it } from "vitest";
import { matchRank, normaliseName, rankSchools, searchQuery } from "@/lib/adapters/scorecardRank";

describe("school search ranking", () => {
  it("sends an ampersand to the API as 'and', since the API matches only the word", () => {
    expect(searchQuery("Washington & Lee")).toBe("washington and lee");
    expect(searchQuery("  Texas A&M ")).toBe("texas a and m");
  });

  it("ignores punctuation and spacing", () => {
    expect(normaliseName("Texas A&M University-College Station")).toBe(
      "texas a and m university college station",
    );
    expect(normaliseName("Texas A & M")).toBe(normaliseName("Texas A&M"));
  });

  it("puts a name that starts with the text first, then a word that does, then any match", () => {
    const rows = [
      { name: "Paul Mitchell the School-Dallas" },
      { name: "Michigan Technological University" },
      { name: "Massachusetts Institute of Technology" },
      { name: "Smith College" },
    ];
    expect(rankSchools("mit", rows).map((r) => r.name)).toEqual(
      [
        "Paul Mitchell the School-Dallas",
        "Smith College",
        "Michigan Technological University",
        "Massachusetts Institute of Technology",
      ].sort(
        (a, b) =>
          matchRank("mit", a) - matchRank("mit", b) ||
          rows.findIndex((r) => r.name === a) - rows.findIndex((r) => r.name === b),
      ),
    );
    expect(matchRank("mit", "Paul Mitchell the School-Dallas")).toBe(2);
    expect(matchRank("mit", "Smith College")).toBe(3);
  });

  it("brings Texas A&M up for 'texas a' and keeps size order within a rank", () => {
    const rows = [
      { name: "Texas State University" },
      { name: "University of Texas Southwestern Medical Center" },
      { name: "Texas A & M University-College Station" },
      { name: "Texas A&M University-Commerce" },
    ];
    expect(rankSchools("texas a", rows).map((r) => r.name)).toEqual([
      "Texas A & M University-College Station",
      "Texas A&M University-Commerce",
      "Texas State University",
      "University of Texas Southwestern Medical Center",
    ]);
  });
});
