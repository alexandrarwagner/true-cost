import type { Cents, Minor } from "./types";

// Money is integers in minor units. Every multiplication by a rate or a percentage rounds
// half-up to an integer immediately, in one of these helpers, and nowhere else.

export function cents(n: number): Cents {
  if (!Number.isFinite(n)) throw new RangeError("cents: not finite");
  return Math.round(n) as Cents;
}

export function usd(dollars: number): Cents {
  return cents(dollars * 100);
}

export function minor(n: number): Minor {
  if (!Number.isFinite(n)) throw new RangeError("minor: not finite");
  return Math.round(n) as Minor;
}

export function addCents(...values: Cents[]): Cents {
  let sum = 0;
  for (const v of values) sum += v;
  return sum as Cents;
}

export function addMinor(...values: Minor[]): Minor {
  let sum = 0;
  for (const v of values) sum += v;
  return sum as Minor;
}

export function mulCents(value: Cents, factor: number): Cents {
  return cents(value * factor);
}

/** Round half-up, which Math.round already does for positive numbers; made explicit for negatives. */
export function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}

/** Basis points of an amount, e.g. 150 bps of $1,000.00 = $15.00. */
export function bps(value: Cents, basisPoints: number): Cents {
  return cents((value * basisPoints) / 10_000);
}

export function clampNonNegative(value: Cents): Cents {
  return (value < 0 ? 0 : value) as Cents;
}

/**
 * Convert US cents to home-currency minor units at `rate` (home units per 1 USD).
 * `minorDigits` is the currency's exponent (2 for INR, 0 for KRW and VND).
 */
export function toMinor(amount: Cents, rate: number, minorDigits: number): Minor {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new RangeError("toMinor: rate must be positive");
  const scale = Math.pow(10, minorDigits - 2);
  return minor(roundHalfUp(amount * rate * scale));
}

/** Home minor units back to US cents, the inverse of toMinor (used for what-if and tests). */
export function toCents(amount: Minor, rate: number, minorDigits: number): Cents {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new RangeError("toCents: rate must be positive");
  const scale = Math.pow(10, minorDigits - 2);
  return cents(roundHalfUp(amount / (rate * scale)));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) throw new RangeError("percentile: empty");
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[idx] ?? 0;
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) throw new RangeError("median: empty");
  const mid = Math.floor(s.length / 2);
  const hi = s[mid] ?? 0;
  const lo = s[mid - 1] ?? hi;
  return s.length % 2 === 0 ? roundHalfUp((lo + hi) / 2) : hi;
}
