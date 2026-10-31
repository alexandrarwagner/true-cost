import { describe, expect, it, vi } from "vitest";
import { mockSources } from "@/lib/adapters/mock/sources";
import type { DataSources } from "@/lib/adapters/types";
import {
  CompareRequestSchema,
  toCompareRequest,
  toEstimateRequests,
  type CompareRequest,
} from "@/lib/schema/compare";
import { EstimateRequestSchema } from "@/lib/schema/estimate";
import { decodeCompareShare, decodeShare, encodeCompareShare } from "@/lib/schema/share";
import { runCompare } from "@/services/compare";

const purdue = EstimateRequestSchema.parse({
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
  options: { housing: { kind: "off_campus", bedrooms: 1, roommates: 0 } },
});
const nyu = {
  school: {
    unitId: 193900,
    name: "New York University",
    city: "New York",
    state: "NY",
    zip: "10012",
  },
  tuitionPerYear: 65622,
  tuitionSource: "school" as const,
};
const asu = {
  school: {
    unitId: 104151,
    name: "Arizona State University",
    city: "Tempe",
    state: "AZ",
    zip: "85287",
  },
  tuitionPerYear: 35167,
  tuitionSource: "user" as const,
};
const req: CompareRequest = CompareRequestSchema.parse(toCompareRequest(purdue, [nyu, asu]));
const NOW = new Date("2026-10-29T12:00:00Z");

describe("CompareRequestSchema", () => {
  it("needs two to three distinct schools and nothing else", () => {
    expect(CompareRequestSchema.safeParse(toCompareRequest(purdue, [])).success).toBe(false);
    expect(CompareRequestSchema.safeParse(toCompareRequest(purdue, [nyu, nyu])).success).toBe(
      false,
    );
    expect(CompareRequestSchema.safeParse(toCompareRequest(purdue, [nyu, asu, asu])).success).toBe(
      false,
    );
    expect(CompareRequestSchema.safeParse({ ...req, extra: 1 }).success).toBe(false);
  });

  it("splits into one ordinary request per school sharing everything else", () => {
    const reqs = toEstimateRequests(req);
    expect(reqs).toHaveLength(3);
    expect(reqs[0]).toEqual(purdue);
    expect(reqs[1]).toMatchObject({ ...nyu, degreeYears: 2, options: purdue.options });
  });
});

describe("compare share URL", () => {
  it("round-trips, and a single-result decoder still reads the first school", () => {
    const params = encodeCompareShare(req);
    expect(params.get("s2")).toBe("193900");
    expect(params.get("ts3")).toBe("user");
    expect([...params.keys()]).not.toContain("name");
    expect(decodeCompareShare(params)).toEqual(req);
    expect(decodeShare(params)).toEqual(purdue);
  });

  it("is null without extra schools or with a broken one", () => {
    const single = new URLSearchParams(encodeCompareShare(req));
    for (const k of [...single.keys()]) if (/\d$/.test(k)) single.delete(k);
    expect(decodeCompareShare(single)).toBeNull();
    const broken = new URLSearchParams(encodeCompareShare(req));
    broken.set("sz2", "nope");
    expect(decodeCompareShare(broken)).toBeNull();
    expect(decodeCompareShare(new URLSearchParams("c=IN&s2=1"))).toBeNull();
  });
});

describe("runCompare", () => {
  it("returns one full column per school in order, with the comparison's share query", async () => {
    const r = await runCompare(req, mockSources, NOW);
    expect(r.columns.map((c) => c.estimate.input.school.unitId)).toEqual([243780, 193900, 104151]);
    expect(r.columns[1]?.estimate.totals.tuition).toBe(65622 * 2 * 100);
    expect(r.currency.code).toBe("INR");
    expect(r.demo).toBe(true);
    expect(r.shareQuery).toContain("s3=104151");
    expect(r.columns[0]?.shareQuery).not.toContain("s2=");
  });

  it("looks the shared currency up once and lets one column degrade alone", async () => {
    const latest = vi.fn(mockSources.fx.latest);
    const history = vi.fn(mockSources.fx.history);
    const sources: DataSources = {
      ...mockSources,
      fx: { latest, history },
      rent: {
        forArea: async (area, signal) =>
          area.state === "NY"
            ? Promise.reject(new Error("hud down"))
            : mockSources.rent.forArea(area, signal),
      },
    };
    const r = await runCompare(req, sources, NOW);
    expect(latest).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledTimes(1);
    expect(r.columns.map((c) => c.degraded)).toEqual([[], ["rent"], []]);
  });
});
