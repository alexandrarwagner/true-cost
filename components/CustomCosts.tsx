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
  `inline-flex h-11 items-center rounded-pill px-4 text-[15px] ${on ? "bg-card text-ink shadow-[0_2px_6px_rgba(17,20,30,0.08)]" : "text-ink hover:bg-white/60"}`;

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
    <section
      aria-labelledby={`${id}-h`}
      className="container mt-12 flex flex-col items-center gap-4 text-center"
    >
      <div>
        <h3 id={`${id}-h`} className="text-xl font-semibold">
          {t.heading}
        </h3>
        <p className="mt-1 text-[15px] text-muted">{t.intro}</p>
      </div>
      <div className="grid w-full max-w-[960px] grid-cols-1 gap-2 rounded-[28px] bg-card p-2 text-left shadow-pill md:min-h-[76px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto_auto] md:items-center md:rounded-pill">
        <label className="flex flex-col px-5 py-2 md:border-r-[1.5px] md:border-line md:py-0">
          <span className="text-xs font-semibold">{t.what}</span>
          <input
            type="text"
            maxLength={40}
            className="h-7 w-full bg-transparent text-[17px] placeholder:text-muted"
            placeholder={t.placeholder}
            value={label}
            disabled={full || busy}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="flex flex-col px-5 py-2 md:border-r-[1.5px] md:border-line md:py-0">
          <span className="text-xs font-semibold">{t.amount}</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            className="h-7 w-full bg-transparent text-[17px] tabular-nums placeholder:text-muted"
            placeholder="0"
            value={amount}
            disabled={full || busy}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <div className="flex gap-1 rounded-pill bg-page p-1" role="group" aria-label={t.currency}>
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
        <div className="flex gap-1 rounded-pill bg-page p-1" role="group" aria-label={t.frequency}>
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
        <button
          type="button"
          className="inline-flex h-[60px] items-center justify-center rounded-pill bg-dark px-7 text-[17px] font-semibold text-white hover:bg-ink disabled:opacity-60"
          disabled={full || busy}
          onClick={add}
        >
          {t.add}
        </button>
      </div>
      <p className="min-h-5 text-sm text-error" role="alert">
        {error ?? ""}
      </p>
      <p className="-mt-3 text-sm text-muted">
        {t.privacy} {full ? t.max : ""}
      </p>
      {value.length > 0 && (
        <ul aria-label={t.list} className="flex flex-wrap justify-center gap-2">
          {value.map((c, i) => (
            <li
              key={`${c.label}-${i}`}
              className="flex items-center gap-2 rounded-pill bg-card px-3 py-1.5 text-sm shadow-card"
            >
              <span>
                {c.label}: {c.currency === "USD" ? "$" : `${homeCurrency} `}
                {c.amount.toLocaleString("en-US")}
                {c.frequency === "monthly" ? ` ${t.perMonth}` : ""}
              </span>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-pill text-muted hover:bg-page"
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
