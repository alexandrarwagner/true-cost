import { describe, expect, it } from "vitest";
import { buildReport, checkSource, needsAttention, summarise } from "@/lib/deals/freshness";

const deal = {
  id: "spotify-premium-student",
  title: "Spotify Premium Student",
  sourceUrl: "https://www.spotify.com/us/student/",
  sourceQuote: "just $6.99/month after. Save up to $17.99/month.",
};

describe("the weekly source check", () => {
  it("classifies a page by whether the quote is still on it, or unreachable", () => {
    expect(
      checkSource(
        deal,
        "national",
        "Premium Student is just $6.99/month after. Save up to $17.99/month. Cancel anytime.",
      ).status,
    ).toBe("ok");
    expect(checkSource(deal, "national", "Premium Student is now $7.99/month.").status).toBe(
      "quote_missing",
    );
    const u = checkSource(deal, "national", null, "HTTP 503");
    expect(u.status).toBe("unreachable");
    expect(u.detail).toBe("HTTP 503");
  });

  it("reports what a person must look at first, and says when nothing is wrong", () => {
    const ok = checkSource(deal, "national", deal.sourceQuote);
    const gone = checkSource(
      { ...deal, id: "x-gone", title: "Gone deal" },
      "New York University",
      "other text",
    );
    const down = checkSource(
      { ...deal, id: "y-down", title: "Down deal" },
      "Boston, MA",
      null,
      "TimeoutError",
    );
    const report = buildReport([ok, gone, down], "2026-11-09");
    expect(report).toContain("### Quote no longer on the page");
    expect(report).toContain("**Gone deal** (New York University, `x-gone`)");
    expect(report).toContain("### Page could not be read");
    expect(report).toContain(
      "**Down deal** (Boston, MA, `y-down`): https://www.spotify.com/us/student/ (TimeoutError)",
    );
    expect(report).toContain("1 ok, 1 with the quote missing, 1 unreachable, of 3 approved deals.");
    expect(needsAttention([ok, gone, down])).toBe(true);
    expect(needsAttention([ok, down])).toBe(false);
    expect(summarise([ok, gone, down])).toEqual({ ok: 1, quote_missing: 1, unreachable: 1 });
    expect(buildReport([ok], "2026-11-09")).toContain(
      "Every approved deal's quote is still on its page (1 checked).",
    );
  });
});
