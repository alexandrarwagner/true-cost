"use client";

import { copy } from "@/content/copy";

type Years = 1 | 2 | 3 | 4 | 5 | 6;
interface Props {
  value: Years;
  onChange: (y: Years) => void;
}

const btn =
  "flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-card text-lg leading-none hover:bg-page focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand disabled:opacity-40";

/** Programme length as a −/+ stepper from 1 to 6 years; the value itself is a real number field. */
export function YearsStepper({ value, onChange }: Props) {
  const t = copy.hero;
  const clamp = (n: number): Years => Math.min(6, Math.max(1, Math.round(n) || 1)) as Years;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        aria-label={t.fewerYears}
        disabled={value <= 1}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <input
        id="years"
        type="number"
        min={1}
        max={6}
        inputMode="numeric"
        className="w-10 bg-transparent text-center text-lg font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <button
        type="button"
        className={btn}
        aria-label={t.moreYears}
        disabled={value >= 6}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}
