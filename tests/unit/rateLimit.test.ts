import { describe, expect, it } from "vitest";
import { LIMITS, MemoryRateLimiter, clientIp } from "@/lib/server/rateLimit";

describe("MemoryRateLimiter", () => {
  it("enforces the stricter AI tier", async () => {
    let t = 1_000_000;
    const rl = new MemoryRateLimiter(LIMITS.ai, () => t);
    for (let i = 0; i < LIMITS.ai.perMinute; i++) expect((await rl.limit("a")).ok).toBe(true);
    const blocked = await rl.limit("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    t += 61_000;
    expect((await rl.limit("a")).ok).toBe(true);
  });

  it("allows more on the general tier and keeps keys independent", async () => {
    const rl = new MemoryRateLimiter(LIMITS.general, () => 0);
    for (let i = 0; i < LIMITS.ai.perMinute + 1; i++) expect((await rl.limit("a")).ok).toBe(true);
    expect((await rl.limit("b")).ok).toBe(true);
  });

  it("enforces the daily limit across minutes", async () => {
    let t = 0;
    const rl = new MemoryRateLimiter({ perMinute: 100, perDay: 5 }, () => t);
    for (let i = 0; i < 5; i++) {
      expect((await rl.limit("a")).ok).toBe(true);
      t += 61_000;
    }
    expect((await rl.limit("a")).ok).toBe(false);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry and falls back to unknown", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2", "x-real-ip": "3.3.3.3" },
    });
    expect(clientIp(req)).toBe("1.1.1.1");
    expect(clientIp(new Request("https://x"))).toBe("unknown");
  });
});
