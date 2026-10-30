import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { FRANKFURTER_URL, frankfurterSource } from "@/lib/adapters/frankfurter";
import { server } from "./msw";

const sig = () => AbortSignal.timeout(2000);

describe("frankfurter adapter", () => {
  it("returns today's rate with its date and source, and caches it", async () => {
    let calls = 0;
    server.use(
      http.get(FRANKFURTER_URL, () => {
        calls++;
        return HttpResponse.json([{ date: "2026-10-30", base: "USD", quote: "INR", rate: 95.3 }]);
      }),
    );
    const src = frankfurterSource();
    expect(await src.latest("inr", sig())).toEqual({
      date: "2026-10-30",
      rate: 95.3,
      source: "Frankfurter blended rates",
    });
    await src.latest("INR", sig());
    expect(calls).toBe(1);
    expect((await src.latest("USD", sig()))?.rate).toBe(1);
  });

  it("fetches a history range when no snapshot exists, dropping non-positive rates", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(FRANKFURTER_URL, ({ request }) => {
        seen = request;
        return HttpResponse.json([
          { date: "2010-01-04", base: "USD", quote: "ZZZ", rate: 10 },
          { date: "2010-01-05", base: "USD", quote: "ZZZ", rate: 0 },
          { date: "2010-01-06", base: "USD", quote: "ZZZ", rate: 11 },
        ]);
      }),
    );
    const hist = await frankfurterSource().history("ZZZ", sig());
    expect(hist).toEqual([
      { date: "2010-01-04", rate: 10 },
      { date: "2010-01-06", rate: 11 },
    ]);
    const u = new URL(seen?.url ?? "");
    expect(u.searchParams.get("from")).toBe("2010-01-01");
    expect(u.searchParams.get("quotes")).toBe("ZZZ");
    expect(await frankfurterSource().history("USD", sig())).toEqual([]);
  });

  it("rejects a malformed body and a 5xx after one retry", async () => {
    let calls = 0;
    server.use(
      http.get(FRANKFURTER_URL, ({ request }) => {
        calls++;
        return new URL(request.url).searchParams.get("quotes") === "BAD"
          ? HttpResponse.json({ nope: 1 })
          : new HttpResponse(null, { status: 503 });
      }),
    );
    await expect(frankfurterSource().latest("BAD", sig())).rejects.toMatchObject({ kind: "http" });
    calls = 0;
    await expect(frankfurterSource().latest("DOWN", sig())).rejects.toMatchObject({
      kind: "http",
      status: 503,
    });
    expect(calls).toBe(2);
  });
});
