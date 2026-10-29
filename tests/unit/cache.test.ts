import { describe, expect, it } from "vitest";
import { TtlCache } from "@/lib/server/cache";

describe("TtlCache", () => {
  it("expires entries and evicts the oldest at capacity", () => {
    let t = 0;
    const c = new TtlCache<string>(1000, 2, () => t);
    c.set("a", "1");
    c.set("b", "2");
    c.set("c", "3");
    expect(c.get("a")).toBeUndefined();
    expect(c.get("c")).toBe("3");
    t = 1001;
    expect(c.get("b")).toBeUndefined();
  });
});
