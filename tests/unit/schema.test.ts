import { describe, expect, it } from "vitest";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { decodeShare, encodeShare } from "@/lib/schema/share";

const valid = {
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
  options: {
    housing: { kind: "off_campus", bedrooms: 2, roommates: 1, twelveMonthLease: true },
    scholarshipPerYear: 5000,
  },
};

describe("EstimateRequestSchema", () => {
  it("accepts a valid request and fills defaults", () => {
    const r = EstimateRequestSchema.parse({ ...valid, options: undefined });
    expect(r.options).toEqual({});
    expect(r.tuitionSource).toBe("school");
  });
  it("rejects unknown keys, bad countries, bad zips and out-of-range money", () => {
    expect(EstimateRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(EstimateRequestSchema.safeParse({ ...valid, countryCode: "XX" }).success).toBe(false);
    expect(
      EstimateRequestSchema.safeParse({ ...valid, school: { ...valid.school, zip: "ABCDE" } })
        .success,
    ).toBe(false);
    expect(EstimateRequestSchema.safeParse({ ...valid, tuitionPerYear: -1 }).success).toBe(false);
    expect(EstimateRequestSchema.safeParse({ ...valid, degreeYears: 5 }).success).toBe(false);
    expect(EstimateRequestSchema.safeParse({ ...valid, options: { dependants: 99 } }).success).toBe(
      false,
    );
  });
});

describe("share URL", () => {
  it("round-trips the inputs and nothing else", () => {
    const req = EstimateRequestSchema.parse(valid);
    const params = encodeShare(req);
    expect([...params.keys()]).not.toContain("name");
    expect(decodeShare(params)).toEqual(req);
  });
  it("returns null for junk", () => {
    expect(decodeShare(new URLSearchParams("c=IN"))).toBeNull();
    expect(decodeShare(new URLSearchParams("c=IN&o=%7Bnot-json"))).toBeNull();
  });
});
