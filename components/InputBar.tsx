"use client";

import { copy } from "@/content/copy";
import { COUNTRIES, currencyInfo } from "@/data/countries";
import type { SchoolSummary } from "@/lib/adapters/types";
import { symbolFor } from "@/lib/ui/format";
import { SchoolSearch } from "./SchoolSearch";
import { YearsStepper } from "./YearsStepper";

interface Props {
  country: string;
  onCountry: (code: string) => void;
  currency: string;
  school: SchoolSummary | null;
  onSchool: (s: SchoolSummary | null) => void;
  tuition: string;
  onTuition: (v: string) => void;
  tuitionHint: string;
  years: 1 | 2 | 3 | 4;
  onYears: (y: 1 | 2 | 3 | 4) => void;
  submitting: boolean;
  onExample: () => void;
  aiEnabled: boolean;
  botToken: string | undefined;
}

const cell = "min-w-0 px-4 py-3 md:py-2";
const label = "block text-xs font-semibold text-ink";
const input =
  "w-full bg-transparent py-1 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand";

/** One bar on wide screens, a stacked form on phones. Every field keeps a real label. */
export function InputBar(p: Props) {
  const t = copy.hero;
  const cur = currencyInfo(p.currency);
  const chip = cur
    ? `${cur.currency} ${symbolFor({ code: cur.currency, locale: cur.locale, minorDigits: cur.minorDigits, grouping: cur.grouping })}`
    : p.currency;
  return (
    <>
      <div className="grid grid-cols-1 divide-y divide-line rounded-card border border-line bg-card shadow-sm md:grid-cols-[1.1fr_1.7fr_1fr_auto_auto] md:items-center md:divide-x md:divide-y-0">
        <div className={cell}>
          <label htmlFor="country" className={label}>
            {t.from}
          </label>
          <div className="flex items-center gap-2">
            <select
              id="country"
              className={`${input} flex-1`}
              value={p.country}
              onChange={(e) => p.onCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="rounded-pill bg-page px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
              {chip}
            </span>
          </div>
        </div>
        <div className={cell}>
          <label htmlFor="school" className={label}>
            {t.school}
          </label>
          <SchoolSearch
            chosen={p.school}
            onChoose={p.onSchool}
            aiEnabled={p.aiEnabled}
            botToken={p.botToken}
          />
        </div>
        <div className={cell}>
          <label htmlFor="tuition" className={label}>
            {t.tuition}
          </label>
          <div className="flex items-center gap-1">
            <span aria-hidden="true">$</span>
            <input
              id="tuition"
              type="number"
              min={0}
              inputMode="numeric"
              className={input}
              value={p.tuition}
              onChange={(e) => p.onTuition(e.target.value)}
              aria-describedby="tuition-hint"
            />
          </div>
          <p id="tuition-hint" className="sr-only">
            {p.tuitionHint}
          </p>
        </div>
        <div className={cell}>
          <label htmlFor="years" className={label}>
            {t.years}
          </label>
          <YearsStepper value={p.years} onChange={p.onYears} />
        </div>
        <div className="p-2 md:pr-2">
          <button
            type="submit"
            className="w-full rounded-pill bg-dark px-5 py-3 font-medium text-white hover:bg-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand disabled:opacity-60 md:w-auto"
            disabled={p.submitting}
            aria-busy={p.submitting}
          >
            {p.submitting ? copy.form.submitting : t.submit}
          </button>
        </div>
      </div>
      <p className="mt-3 text-center">
        <button type="button" className="underline underline-offset-4" onClick={p.onExample}>
          {t.example}
        </button>
      </p>
    </>
  );
}
