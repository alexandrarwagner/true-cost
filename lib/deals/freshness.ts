import type { Deal } from "@/lib/core/deals";
import { quoteAppears } from "./research";

// The pure part of the weekly source check (scripts/check-deal-sources.ts): what one check
// says about a deal, and the report a person reads. The fetching lives in the script.

export type SourceStatus = "ok" | "quote_missing" | "unreachable";

export interface SourceCheck {
  id: string;
  title: string;
  /** "national", "City, ST" or the school's name. */
  where: string;
  url: string;
  status: SourceStatus;
  /** HTTP status or error name, for the report. */
  detail?: string;
}

/** Classifies a fetched page for one deal; `text` is null when the page could not be read. */
export function checkSource(
  deal: Pick<Deal, "id" | "title" | "sourceUrl" | "sourceQuote">,
  where: string,
  text: string | null,
  detail?: string,
): SourceCheck {
  const base = { id: deal.id, title: deal.title, where, url: deal.sourceUrl };
  if (text === null) return { ...base, status: "unreachable", ...(detail ? { detail } : {}) };
  return { ...base, status: quoteAppears(deal.sourceQuote, text) ? "ok" : "quote_missing" };
}

export function summarise(checks: SourceCheck[]): Record<SourceStatus, number> {
  const out: Record<SourceStatus, number> = { ok: 0, quote_missing: 0, unreachable: 0 };
  for (const c of checks) out[c.status]++;
  return out;
}

/** True when a person needs to look: a quote has gone from its page. */
export function needsAttention(checks: SourceCheck[]): boolean {
  return checks.some((c) => c.status === "quote_missing");
}

/**
 * The report for the issue: what to re-check first, then pages that could not be read
 * (often a page that needs JavaScript, so a person decides), then a one-line tally.
 */
export function buildReport(checks: SourceCheck[], today: string): string {
  const missing = checks.filter((c) => c.status === "quote_missing");
  const unreachable = checks.filter((c) => c.status === "unreachable");
  const n = summarise(checks);
  const lines = [`## Deals to re-check, ${today}`, ""];
  if (missing.length === 0 && unreachable.length === 0) {
    lines.push(`Every approved deal's quote is still on its page (${n.ok} checked).`);
    return lines.join("\n") + "\n";
  }
  if (missing.length > 0) {
    lines.push(
      "### Quote no longer on the page",
      "",
      "The wording we rely on has gone. Open the page: if the deal changed or ended, set its",
      "status to `expired`; if only the wording moved, update `sourceQuote` and `checkedOn`.",
      "",
    );
    for (const c of missing) lines.push(`- **${c.title}** (${c.where}, \`${c.id}\`): ${c.url}`);
    lines.push("");
  }
  if (unreachable.length > 0) {
    lines.push(
      "### Page could not be read",
      "",
      "Fetching failed or the page needs a browser. Check it by hand; nothing has changed yet.",
      "",
    );
    for (const c of unreachable)
      lines.push(
        `- **${c.title}** (${c.where}, \`${c.id}\`): ${c.url}${c.detail ? ` (${c.detail})` : ""}`,
      );
    lines.push("");
  }
  lines.push(
    `${n.ok} ok, ${n.quote_missing} with the quote missing, ${n.unreachable} unreachable, of ${checks.length} approved deals.`,
  );
  return lines.join("\n") + "\n";
}
