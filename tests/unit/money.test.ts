import { describe, expect, it } from "vitest";
import {
  bps,
  cents,
  median,
  mulCents,
  percentile,
  roundHalfUp,
  toCents,
  toMinor,
  usd,
} from "@/lib/core/money";

describe("money", () => {
  it("builds and rounds integers", () => {
    expect(usd(28794)).toBe(2879400);
    expect(cents(10.5)).toBe(11);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(() => cents(Number.NaN)).toThrow();
  });
  it("converts to home minor units with the currency exponent", () => {
    expect(toMinor(usd(75000), 88.7, 2)).toBe(665_250_000); // ₹66,52,500.00
    expect(toMinor(usd(75000), 95.35, 2)).toBe(715_125_000);
    expect(toMinor(usd(1), 1360.5, 0)).toBe(1361); // KRW, no decimals
    expect(toCents(toMinor(usd(1234.56), 95.27, 2), 95.27, 2)).toBe(usd(1234.56));
    expect(() => toMinor(usd(1), 0, 2)).toThrow();
  });
  it("applies basis points and factors", () => {
    expect(bps(usd(1000), 150)).toBe(usd(15));
    expect(mulCents(usd(28794), 1 / 2)).toBe(1439700);
  });
  it("computes median and percentiles on sorted inputs", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.1)).toBe(20);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.9)).toBe(90);
  });
});
