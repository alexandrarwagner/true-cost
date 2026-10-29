import type { Cents, Minor } from "./types";

// Display formatting only. Money stays integer minor units until this point.

export interface FormatOptions {
  currency: string;
  locale: string;
  minorDigits: number;
  /** Show whole units only (default true: families budget in whole rupees/dollars). */
  wholeUnits?: boolean;
}

function units(amount: number, minorDigits: number): number {
  return amount / Math.pow(10, minorDigits);
}

export function formatMoney(amount: Minor | Cents, opts: FormatOptions): string {
  const whole = opts.wholeUnits ?? true;
  const value = units(amount, opts.minorDigits);
  return new Intl.NumberFormat(opts.locale, {
    style: "currency",
    currency: opts.currency,
    minimumFractionDigits: whole ? 0 : opts.minorDigits,
    maximumFractionDigits: whole ? 0 : opts.minorDigits,
  }).format(whole ? Math.round(value) : value);
}

export function formatUsd(amount: Cents, wholeUnits = true): string {
  return formatMoney(amount, { currency: "USD", locale: "en-US", minorDigits: 2, wholeUnits });
}

/**
 * Indian short form: ₹71.5 lakh, ₹1.2 crore. Below one lakh, falls back to normal grouping.
 * `symbol` is the currency symbol to prefix (₹ for INR, Rs. for NPR, ৳ for BDT).
 */
export function formatLakhCrore(amount: Minor, minorDigits: number, symbol: string): string {
  const value = units(amount, minorDigits);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${symbol}${trim((abs / 1e7).toFixed(2))} crore`;
  if (abs >= 1e5) return `${sign}${symbol}${trim((abs / 1e5).toFixed(1))} lakh`;
  return `${sign}${symbol}${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(abs)}`;
}

function trim(s: string): string {
  return s.replace(/\.?0+$/, "");
}

/** A range such as "₹66.5 lakh to ₹71.5 lakh". */
export function formatRange(low: string, high: string): string {
  return `${low} to ${high}`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}
