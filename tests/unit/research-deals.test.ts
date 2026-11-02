import { describe, expect, it } from "vitest";
import {
  DraftPageSchema,
  extractUrls,
  htmlToText,
  quoteAppears,
  slugId,
} from "@/lib/deals/research";

describe("deals research helpers", () => {
  it("turns a page into readable text without scripts, styles or tags", () => {
    const html = `<html><head><style>p{color:red}</style><script>alert(1)</script></head>
<body><h1>Student plan</h1><p>Students pay&nbsp;$6.99&#47;month &amp; verify once.</p><!-- x --></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Student plan");
    expect(text).toContain("Students pay $6.99/month & verify once.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
  });

  it("finds a quote on the page regardless of whitespace, curly quotes and case", () => {
    const page =
      "Students can choose the Apple Music Student Plan at $6.99 per month.\n  It’s “verified”.";
    expect(quoteAppears("Apple Music Student Plan at $6.99 per month", page)).toBe(true);
    expect(quoteAppears('It\'s "verified"', page)).toBe(true);
    expect(quoteAppears("Students can choose   the apple music student plan", page)).toBe(true);
    expect(quoteAppears("Apple Music Student Plan at $5.99 per month", page)).toBe(false);
    expect(quoteAppears("short", page)).toBe(false);
  });

  it("keeps only https page links from outside the blocked sites", () => {
    const text = `See https://www.spotify.com/us/student/. Also https://www.reddit.com/r/x and
http://insecure.example.com/deal, https://www.apple.com/apple-music/#student, https://a.b/x.pdf`;
    expect(extractUrls(text)).toEqual([
      "https://www.spotify.com/us/student/",
      "https://www.apple.com/apple-music/",
    ]);
  });

  it("makes stable ids within the schema's pattern", () => {
    expect(slugId("Apple Music Student Plan", "www.apple.com")).toBe(
      "apple-apple-music-student-plan",
    );
    expect(slugId("Café ¡Deal! 50% off", "example.org")).toBe("example-cafe-deal-50-off");
    expect(slugId("x".repeat(100), "h.com")).toHaveLength(63);
  });

  it("the draft shape needs both prices or neither", () => {
    const base = {
      title: "A deal",
      category: "software",
      eligibility: "students",
      howToGet: "sign up",
      sourceQuote: "a quote long enough to count",
      period: null,
    };
    expect(
      DraftPageSchema.safeParse({
        deals: [{ ...base, studentPriceCents: null, regularPriceCents: null }],
      }).success,
    ).toBe(true);
    expect(
      DraftPageSchema.safeParse({
        deals: [{ ...base, studentPriceCents: 699, regularPriceCents: 1199, period: "month" }],
      }).success,
    ).toBe(true);
    expect(DraftPageSchema.safeParse({ deals: [{ ...base, extra: 1 }] }).success).toBe(false);
  });
});
