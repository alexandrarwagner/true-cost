import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { HUD_BASE, hudSource, parseStateData, pickArea } from "@/lib/adapters/hud";
import { server } from "./msw";

// Shaped after HUD's documented statedata example; field names are read tolerantly.
const indiana = {
  data: {
    metroareas: [
      {
        metro_name: "Lafayette-West Lafayette, IN MSA",
        code: "METRO29200M29200",
        smallarea_status: "0",
        Efficiency: "850",
        "One-Bedroom": "950",
        "Two-Bedroom": "1150",
        "Three-Bedroom": "1500",
        "Four-Bedroom": "1700",
      },
      {
        metro_name: "Indianapolis-Carmel-Anderson, IN HUD Metro FMR Area",
        code: "METRO26900M26900",
        smallarea_status: "1",
        Efficiency: "1000",
        "One-Bedroom": "1100",
        "Two-Bedroom": "1300",
        "Three-Bedroom": "1650",
        "Four-Bedroom": "1900",
      },
    ],
    counties: [
      {
        county_name: "Adams County",
        fips_code: "1800199999",
        Efficiency: 700,
        "One-Bedroom": 750,
        "Two-Bedroom": 950,
        "Three-Bedroom": 1200,
        "Four-Bedroom": 1300,
      },
    ],
  },
};
const sig = () => AbortSignal.timeout(2000);

describe("hud adapter", () => {
  it("parses metros and counties, coercing string rents and small-area flags", () => {
    const areas = parseStateData(indiana);
    expect(areas.map((a) => [a.type, a.smallArea, a.monthly["1"]])).toEqual([
      ["metro", false, 950],
      ["metro", true, 1100],
      ["county", false, 750],
    ]);
    expect(parseStateData({ unexpected: true })).toEqual([]);
    expect(
      parseStateData({
        data: { metroareas: [{ metro_name: "Broken", code: "x", Efficiency: 0 }] },
      }),
    ).toEqual([]);
  });

  it("matches a city to its metro, else falls back to a labelled state-wide typical value", () => {
    const areas = parseStateData(indiana);
    expect(pickArea(areas, "West Lafayette")).toMatchObject({
      matched: true,
      area: { code: "METRO29200M29200" },
    });
    expect(pickArea(areas, "Nowhere")).toMatchObject({
      matched: false,
      area: { name: "State-wide typical rent (city not matched)", monthly: { "1": 950 } },
    });
    expect(pickArea([], "x")).toBeNull();
  });

  it("calls statedata with a bearer token when there is no snapshot, and returns null without a token", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${HUD_BASE}/fmr/statedata/IN`, ({ request }) => {
        seen = request;
        return HttpResponse.json(indiana);
      }),
    );
    const rent = await hudSource("tok").forArea(
      { zip: "47907", state: "IN", city: "West Lafayette" },
      sig(),
    );
    expect(rent).toMatchObject({
      areaName: "Lafayette-West Lafayette, IN MSA",
      smallArea: false,
      monthlyByBedrooms: { 1: 95000 },
      source: { kind: "government" },
    });
    expect(seen?.headers.get("authorization")).toBe("Bearer tok");
    expect(new URL(seen?.url ?? "").searchParams.get("year")).toBe("2027");
    expect(
      await hudSource(undefined).forArea({ zip: "47907", state: "IN", city: "x" }, sig()),
    ).toBeNull();
  });

  it("labels an unmatched city as an estimate and surfaces a 401", async () => {
    server.use(
      http.get(`${HUD_BASE}/fmr/statedata/IN`, () => HttpResponse.json(indiana)),
      http.get(`${HUD_BASE}/fmr/statedata/XX`, () =>
        HttpResponse.json({ error: "Unauthenticated" }, { status: 401 }),
      ),
    );
    const rent = await hudSource("tok").forArea(
      { zip: "46000", state: "IN", city: "Nowhere" },
      sig(),
    );
    expect(rent?.source.kind).toBe("estimate");
    await expect(
      hudSource("tok").forArea({ zip: "0", state: "XX", city: "x" }, sig()),
    ).rejects.toMatchObject({ kind: "http", status: 401 });
  });
});
