import { z } from "zod";

// The pure parts of the deals research script (scripts/research-deals.ts): what the model
// may return, how a page becomes text, and the check that a quote really is on the page.
// No network and no SDK here, so the unit tests cover them.

/** Sites that aggregate or resell discounts; never an official source (ADR 014). */
export const BLOCKED_DOMAINS = [
  "reddit.com",
  "retailmenot.com",
  "coupons.com",
  "dealnews.com",
  "slickdeals.net",
  "honey.com",
  "joinhoney.com",
  "groupon.com",
  "studentbeans.com",
  "unidays.com",
  "myunidays.com",
  "pinterest.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "quora.com",
  "medium.com",
];

/** One deal as the model reports it from a page; the script adds id, scope, date and status. */
export const DraftDealSchema = z.strictObject({
  title: z.string().trim().min(3).max(120),
  category: z.enum([
    "transport",
    "fitness",
    "culture",
    "software",
    "subscriptions",
    "phone",
    "food",
    "other",
  ]),
  /** Whole US cents, only when the page states both prices; otherwise both null. */
  studentPriceCents: z.number().int().min(0).max(10_000_000).nullable(),
  regularPriceCents: z.number().int().min(0).max(10_000_000).nullable(),
  period: z.enum(["month", "year", "once"]).nullable(),
  eligibility: z.string().trim().min(3).max(300),
  howToGet: z.string().trim().min(3).max(400),
  /** Copied exactly from the page, 10 to 600 characters, containing the key fact. */
  sourceQuote: z.string().trim().min(10).max(600),
});
export type DraftDeal = z.infer<typeof DraftDealSchema>;

export const DraftPageSchema = z.strictObject({ deals: z.array(DraftDealSchema).max(10) });

/** Readable text from an HTML page: scripts, styles and tags out, whitespace collapsed. */
export function htmlToText(html: string, maxChars = 60_000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return text.slice(0, maxChars);
}

/** Loose form for matching: one space for any whitespace, straight quotes, no case. */
export function normaliseForMatch(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when the quote appears on the page, allowing for whitespace and quote-mark differences. */
export function quoteAppears(quote: string, pageText: string): boolean {
  const q = normaliseForMatch(quote);
  return q.length >= 10 && normaliseForMatch(pageText).includes(q);
}

/** A stable deal id from the title and the page host, within the schema's pattern. */
export function slugId(title: string, host: string): string {
  const base = `${host.replace(/^www\./, "").split(".")[0] ?? "deal"}-${title}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 63).replace(/-+$/g, "") || "deal";
}

/** https URLs in a block of text, de-duplicated, blocked hosts and non-pages left out. */
export function extractUrls(text: string, max = 12): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/https:\/\/[^\s<>"')\]]+/g)) {
    const raw = m[0].replace(/[.,;:!?]+$/, "");
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;
    if (!url.hostname.includes(".") || url.hostname === "localhost") continue;
    if (BLOCKED_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4)$/i.test(url.pathname)) continue;
    url.hash = "";
    const s = url.toString();
    if (!out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
