import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { readJsonCapped, safeFetch, UpstreamError } from "@/lib/server/http";
import { server } from "./msw";

describe("safeFetch", () => {
  it("refuses hosts outside the allowlist, and plain http", async () => {
    await expect(safeFetch(new URL("https://evil.example/x"))).rejects.toMatchObject({
      kind: "blocked_host",
    });
    await expect(safeFetch(new URL("http://api.frankfurter.dev/v2/rates"))).rejects.toMatchObject({
      kind: "blocked_host",
    });
  });

  it("follows a redirect to an allowlisted host but refuses one to an unknown host", async () => {
    server.use(
      http.get("https://api.data.gov/good", () =>
        HttpResponse.redirect("https://api.frankfurter.dev/landed", 302),
      ),
      http.get("https://api.frankfurter.dev/landed", () => HttpResponse.json({ ok: true })),
      http.get("https://api.data.gov/bad", () =>
        HttpResponse.redirect("https://attacker.test/x", 302),
      ),
    );
    expect(await (await safeFetch(new URL("https://api.data.gov/good"))).json()).toEqual({
      ok: true,
    });
    await expect(safeFetch(new URL("https://api.data.gov/bad"))).rejects.toMatchObject({
      kind: "blocked_host",
      host: "attacker.test",
    });
  });

  it("times out, and retries once on a network error or 5xx for GET", async () => {
    let calls = 0;
    server.use(
      http.get("https://api.frankfurter.dev/slow", async () => {
        await new Promise((r) => setTimeout(r, 300));
        return HttpResponse.json([]);
      }),
      http.get("https://api.frankfurter.dev/flaky", () =>
        ++calls === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json({ ok: 1 }),
      ),
    );
    await expect(
      safeFetch(new URL("https://api.frankfurter.dev/slow"), { timeoutMs: 50 }),
    ).rejects.toSatisfy((e: unknown) => e instanceof UpstreamError && e.kind === "timeout");
    const res = await safeFetch(new URL("https://api.frankfurter.dev/flaky"), { retryOnce: true });
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

describe("readJsonCapped", () => {
  it("parses small bodies and refuses oversized ones", async () => {
    server.use(
      http.get("https://api.data.gov/small", () => HttpResponse.json({ a: 1 })),
      http.get("https://api.data.gov/big", () =>
        HttpResponse.text("[" + '"x",'.repeat(5000) + '"x"]'),
      ),
    );
    expect(await readJsonCapped(await safeFetch(new URL("https://api.data.gov/small")))).toEqual({
      a: 1,
    });
    await expect(
      readJsonCapped(await safeFetch(new URL("https://api.data.gov/big")), 1000),
    ).rejects.toMatchObject({ kind: "too_large" });
  });
});
