import { describe, expect, it } from "vitest";
import { formatLakhCrore, formatMoney, formatUsd } from "@/lib/core/format";
import { usd } from "@/lib/core/money";
import type { Minor } from "@/lib/core/types";

describe("format", () => {
  it("uses Indian grouping for en-IN", () => {
    expect(
      formatMoney(715_125_000 as Minor, { currency: "INR", locale: "en-IN", minorDigits: 2 }),
    ).toBe("₹71,51,250");
  });
  it("formats KRW with no decimals and USD normally", () => {
    expect(
      formatMoney(1_234_567 as Minor, { currency: "KRW", locale: "ko-KR", minorDigits: 0 }),
    ).toBe("₩1,234,567");
    expect(formatUsd(usd(28794))).toBe("$28,794");
  });
  it("formats lakh and crore", () => {
    expect(formatLakhCrore(715_125_000 as Minor, 2, "₹")).toBe("₹71.5 lakh");
    expect(formatLakhCrore(665_250_000 as Minor, 2, "₹")).toBe("₹66.5 lakh");
    expect(formatLakhCrore(1_234_000_000 as Minor, 2, "₹")).toBe("₹1.23 crore");
    expect(formatLakhCrore(4_500_000 as Minor, 2, "₹")).toBe("₹45,000");
  });
});
