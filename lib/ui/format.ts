import { formatLakhCrore, formatMoney, formatUsd } from "@/lib/core/format";
import type { Cents, Minor } from "@/lib/core/types";
import type { EstimateResponse } from "@/services/estimate";

// Display helpers for components. Client-safe: no env, no server imports.

export type CurrencyDisplay = EstimateResponse["currency"];

export function symbolFor(cur: CurrencyDisplay): string {
  const parts = new Intl.NumberFormat(cur.locale, {
    style: "currency",
    currency: cur.code,
  }).formatToParts(1);
  return parts.find((p) => p.type === "currency")?.value ?? cur.code;
}

/** Full home-currency amount with the locale's grouping, e.g. ₹71,51,250. */
export function home(amount: Minor, cur: CurrencyDisplay): string {
  return formatMoney(amount, {
    currency: cur.code,
    locale: cur.locale,
    minorDigits: cur.minorDigits,
  });
}

/** Short form where the culture uses one (₹71.5 lakh); otherwise the full amount. */
export function homeShort(amount: Minor, cur: CurrencyDisplay): string {
  if (cur.grouping === "indian") return formatLakhCrore(amount, cur.minorDigits, symbolFor(cur));
  return home(amount, cur);
}

export function usdFmt(amount: Cents): string {
  return formatUsd(amount);
}

export function homeFromUsd(amount: Cents, rate: number, cur: CurrencyDisplay): Minor {
  return Math.round(amount * rate * Math.pow(10, cur.minorDigits - 2)) as Minor;
}

export function dateFmt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function monthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
