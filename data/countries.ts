// The ten launch countries (IIE Open Doors 2025 top ten by origin) with currency and locale.
// minorDigits is the ISO 4217 exponent. `grouping: "indian"` uses lakh/crore groupings.

export interface Country {
  code: string;
  name: string;
  currency: string;
  currencyName: string;
  minorDigits: 0 | 2;
  locale: string;
  grouping: "indian" | "standard";
  /** Rates for this currency need a caveat in the UI. */
  rateCaveat?: "official_vs_market";
}

export const COUNTRIES: readonly Country[] = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    currencyName: "Indian rupee",
    minorDigits: 2,
    locale: "en-IN",
    grouping: "indian",
  },
  {
    code: "CN",
    name: "China",
    currency: "CNY",
    currencyName: "Chinese yuan",
    minorDigits: 2,
    locale: "zh-CN",
    grouping: "standard",
  },
  {
    code: "KR",
    name: "South Korea",
    currency: "KRW",
    currencyName: "South Korean won",
    minorDigits: 0,
    locale: "ko-KR",
    grouping: "standard",
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    currencyName: "Canadian dollar",
    minorDigits: 2,
    locale: "en-CA",
    grouping: "standard",
  },
  {
    code: "VN",
    name: "Vietnam",
    currency: "VND",
    currencyName: "Vietnamese dong",
    minorDigits: 0,
    locale: "vi-VN",
    grouping: "standard",
  },
  {
    code: "NP",
    name: "Nepal",
    currency: "NPR",
    currencyName: "Nepalese rupee",
    minorDigits: 2,
    locale: "ne-NP",
    grouping: "indian",
  },
  {
    code: "TW",
    name: "Taiwan",
    currency: "TWD",
    currencyName: "New Taiwan dollar",
    minorDigits: 2,
    locale: "zh-TW",
    grouping: "standard",
  },
  {
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    currencyName: "Nigerian naira",
    minorDigits: 2,
    locale: "en-NG",
    grouping: "standard",
    rateCaveat: "official_vs_market",
  },
  {
    code: "BD",
    name: "Bangladesh",
    currency: "BDT",
    currencyName: "Bangladeshi taka",
    minorDigits: 2,
    locale: "bn-BD",
    grouping: "indian",
  },
  {
    code: "BR",
    name: "Brazil",
    currency: "BRL",
    currencyName: "Brazilian real",
    minorDigits: 2,
    locale: "pt-BR",
    grouping: "standard",
  },
] as const;

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function currencyInfo(
  currency: string,
): Pick<Country, "currency" | "minorDigits" | "locale" | "grouping"> | undefined {
  if (currency.toUpperCase() === "USD")
    return { currency: "USD", minorDigits: 2, locale: "en-US", grouping: "standard" };
  const c = COUNTRIES.find((c) => c.currency === currency.toUpperCase());
  return c
    ? { currency: c.currency, minorDigits: c.minorDigits, locale: c.locale, grouping: c.grouping }
    : undefined;
}
