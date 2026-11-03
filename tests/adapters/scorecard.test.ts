import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { rowToCosts, rowToSummary, SCORECARD_URL, scorecardSource } from "@/lib/adapters/scorecard";
import { server } from "./msw";

const purdue = {
  id: 243780,
  "school.name": "Purdue University-Main Campus",
  "school.city": "West Lafayette",
  "school.state": "IN",
  "school.zip": "47907-2040",
  "school.degrees_awarded.predominant": 3,
  "latest.cost.tuition.out_of_state": 28794,
  "latest.cost.roomboard.oncampus": 12820,
  "latest.cost.otherexpense.oncampus": 2340,
  "latest.cost.booksupply": 1090,
  "latest.cost.roomboard.offcampus": null,
};
const ok = (results: unknown[]) =>
  HttpResponse.json({ metadata: { total: results.length, page: 0, per_page: 100 }, results });
const sig = () => AbortSignal.timeout(2000);

describe("scorecard adapter", () => {
  it("maps rows to summaries and costs, dropping nulls", () => {
    expect(rowToSummary(purdue)).toEqual({
      unitId: 243780,
      name: "Purdue University-Main Campus",
      city: "West Lafayette",
      state: "IN",
      zip: "47907",
      tuitionOutOfStateUsd: 2879400,
      predominantDegree: 3,
    });
    const costs = rowToCosts(purdue, {
      id: "scorecard",
      kind: "school",
      name: "x",
      date: "2026-10-30",
    });
    expect(costs).toMatchObject({ roomBoardOnCampusUsd: 1282000, booksSupplyUsd: 109000 });
    expect(costs.roomBoardOffCampusUsd).toBeUndefined();
  });

  it("searches with the key in a header and caches the result", async () => {
    let calls = 0;
    let seen: Request | undefined;
    server.use(
      http.get(SCORECARD_URL, ({ request }) => {
        calls++;
        seen = request;
        return ok([purdue]);
      }),
    );
    // A name that is in no school of the snapshot, so the search has to ask the API.
    const src = scorecardSource("k-test");
    const first = await src.search("zzqx", sig());
    const second = await src.search("ZZQX ", sig());
    expect(first[0]?.unitId).toBe(243780);
    expect(second).toEqual(first);
    expect(calls).toBe(1);
    const u = new URL(seen?.url ?? "");
    expect(u.searchParams.get("school.name")).toBe("zzqx");
    expect(u.searchParams.has("api_key")).toBe(false);
    expect(seen?.headers.get("x-api-key")).toBe("k-test");
  });

  it("throws without a key and on a 429, and returns null for an unknown school", async () => {
    // The snapshot still answers without a key; only a name it lacks needs the API.
    expect(await scorecardSource(undefined).search("university", sig())).toHaveLength(10);
    await expect(scorecardSource(undefined).search("zzqx", sig())).rejects.toMatchObject({
      kind: "blocked_host",
    });
    server.use(
      http.get(SCORECARD_URL, ({ request }) =>
        new URL(request.url).searchParams.get("id") === "1"
          ? ok([])
          : new HttpResponse(null, { status: 429 }),
      ),
    );
    await expect(scorecardSource("k").search("zzqx rate", sig())).rejects.toMatchObject({
      kind: "http",
      status: 429,
    });
    expect(await scorecardSource("k").costs(1, sig())).toBeNull();
  });

  it("finds a school in the snapshot before asking the API, ranked by how the name matches", async () => {
    // One local match, so the API is asked to fill the list; it has nothing to add.
    server.use(http.get(SCORECARD_URL, () => ok([])));
    const one = await scorecardSource("k").search("washington and lee", sig());
    expect(one[0]?.name).toBe("Washington and Lee University");
    // Ten or more local matches: the API is not asked at all.
    server.use(http.get(SCORECARD_URL, () => new HttpResponse(null, { status: 500 })));
    const many = await scorecardSource("k").search("university", sig());
    expect(many).toHaveLength(10);
    expect(many.every((s) => /university/i.test(s.name))).toBe(true);
  });

  it("fetches costs live when the school is not in the snapshot", async () => {
    // 243780 (Purdue) is in data/snapshots/scorecard-costs.json since 2 November; an id that
    // is not forces the live call, which the mock answers with Purdue's record.
    server.use(http.get(SCORECARD_URL, () => ok([purdue])));
    const r = await scorecardSource("k", { now: () => new Date("2026-10-30T00:00:00Z") }).costs(
      999999,
      sig(),
    );
    expect(r?.summary.name).toBe("Purdue University-Main Campus");
    expect(r?.costs.source).toMatchObject({
      kind: "school",
      name: "College Scorecard",
      date: "2026-10-30",
    });
  });
});
