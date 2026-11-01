"use client";

import { useId, useState } from "react";
import { copy } from "@/content/copy";
import { MAX_CUSTOM_COSTS } from "@/lib/schema/estimate";

export interface CustomCostInput {
  label: string;
  amount: number;
  currency: "USD" | "home";
  frequency: "one_off" | "monthly";
}

interface Props {
  value: CustomCostInput[];
  homeCurrency: string;
  busy: boolean;
  onChange: (next: CustomCostInput[]) => void;
}

const toggle = (on: boolean) =>
  `rounded-pill px-3 py-1.5 text-sm font-medium ${on ? "bg-dark text-white" : "bg-page hover:bg-line"}`;

/** "Know a cost we missed?": the user's own items, re-run through the engine as they are added. */
export function CustomCosts({ value, homeCurrency, busy, onChange }: Props) {
  const t = copy.customCosts;
  const id = useId();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "home">("USD");
  const [frequency, setFrequency] = useState<"one_off" | "monthly">("one_off");
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_CUSTOM_COSTS;

  function add() {
    const name = label.trim();
    const n = Number(amount);
    if (!name || !(n > 0)) return setError(t.invalid);
    setError(null);
    onChange([...value, { label: name, amount: n, currency, frequency }]);
    setLabel("");
    setAmount("");
  }

  return (
    <section aria-labelledby={`${id}-h`} className="mx-auto mt-8 max-w-3xl text-center">
      <h3 id={`${id}-h`} className="text-xl font-semibold">
        {t.heading}
      </h3>
      <p className="mt-1 text-muted">{t.intro}</p>
      <div className="mt-4 grid grid-cols-1 gap-2 rounded-card border border-line bg-card p-2 text-left shadow-card sm:grid-cols-[1.4fr_1fr_auto_auto_auto] sm:items-center sm:rounded-pill">
        <div className="px-3 py-2">
          <label htmlFor={`${id}-what`} className="block text-xs font-semibold">
            {t.what}
          </label>
          <input
            id={`${id}-what`}
            type="text"
            maxLength={40}
            className="w-full bg-transparent py-1 placeholder:text-muted"
            placeholder={t.placeholder}
            value={label}
            disabled={full || busy}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="px-3 py-2">
          <label htmlFor={`${id}-amount`} className="block text-xs font-semibold">
            {t.amount}
          </label>
          <input
            id={`${id}-amount`}
            type="number"
            min={0}
            inputMode="decimal"
            className="w-full bg-transparent py-1"
            placeholder="0"
            value={amount}
            disabled={full || busy}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex gap-1 px-2" role="group" aria-label={t.currency}>
          {(["USD", "home"] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={toggle(currency === c)}
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
            >
              {c === "USD" ? "USD" : homeCurrency}
            </button>
          ))}
        </div>
        <div className="flex gap-1 px-2" role="group" aria-label={t.frequency}>
          {(["one_off", "monthly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={toggle(frequency === f)}
              aria-pressed={frequency === f}
              onClick={() => setFrequency(f)}
            >
              {f === "one_off" ? t.oneTime : t.monthly}
            </button>
          ))}
        </div>
        <div className="p-1">
          <button
            type="button"
            className="w-full rounded-pill bg-dark px-5 py-2.5 font-medium text-white hover:bg-ink disabled:opacity-60"
            disabled={full || busy}
            onClick={add}
          >
            {t.add}
          </button>
        </div>
      </div>
      <p className="mt-2 min-h-5 text-sm text-error" role="alert">
        {error ?? ""}
      </p>
      <p className="text-sm text-muted">
        {t.privacy} {full ? t.max : ""}
      </p>
      {value.length > 0 && (
        <ul aria-label={t.list} className="mt-3 flex flex-wrap justify-center gap-2">
          {value.map((c, i) => (
            <li
              key={`${c.label}-${i}`}
              className="flex items-center gap-2 rounded-pill bg-card px-3 py-1 text-sm shadow-card"
            >
              <span>
                {c.label}: {c.currency === "USD" ? "$" : `${homeCurrency} `}
                {c.amount.toLocaleString("en-US")}
                {c.frequency === "monthly" ? ` ${t.perMonth}` : ""}
              </span>
              <button
                type="button"
                className="text-muted underline underline-offset-4"
                aria-label={t.remove(c.label)}
                disabled={busy}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
