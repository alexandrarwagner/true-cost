"use client";

import { copy } from "@/content/copy";
import { COUNTRIES } from "@/data/countries";

interface Props {
  country: string;
  onCountry: (code: string) => void;
  currency: string;
  onCurrency: (code: string) => void;
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";

/** Where the student is from and which currency they pay in. */
export function OriginFields({ country, onCountry, currency, onCurrency }: Props) {
  const t = copy.form;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="block">
        {t.country}
        <select
          id="country"
          className={field}
          value={country}
          onChange={(e) => onCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t.currency}
        <select
          id="currency"
          className={field}
          value={currency}
          onChange={(e) => onCurrency(e.target.value)}
          aria-describedby="currency-hint"
        >
          {[...COUNTRIES.map((c) => c.currency), "USD"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span id="currency-hint" className="mt-1 block text-sm text-neutral-700">
          {t.currencyHint}
        </span>
      </label>
    </div>
  );
}
