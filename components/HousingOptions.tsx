"use client";

import { copy } from "@/content/copy";
import type { EstimateRequestInput } from "@/lib/schema/estimate";

type Housing = NonNullable<NonNullable<EstimateRequestInput["options"]>["housing"]>;

interface Props {
  value: Housing;
  onChange: (next: Housing) => void;
}

const field = "mt-1 w-full rounded-[12px] border-[1.5px] border-line-strong bg-white px-3 py-2.5";
const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

export function HousingOptions({ value, onChange }: Props) {
  const t = copy.form;
  const set = (patch: Partial<Housing>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="mt-4">
      <legend className="font-medium">{t.housing}</legend>
      <div className="mt-1 flex gap-6">
        {(["on_campus", "off_campus"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input
              type="radio"
              name="housingKind"
              className="h-4 w-4"
              checked={value.kind === k}
              onChange={() => set({ kind: k })}
            />
            {k === "on_campus" ? t.onCampus : t.offCampus}
          </label>
        ))}
      </div>
      {value.kind === "off_campus" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            {t.bedrooms}
            <select
              className={field}
              value={value.bedrooms ?? 1}
              onChange={(e) => set({ bedrooms: Number(e.target.value) as Housing["bedrooms"] })}
            >
              <option value={0}>{t.studio}</option>
              {[1, 2, 3, 4].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {t.roommates}
            <input
              type="number"
              min={0}
              max={6}
              className={field}
              value={value.roommates ?? 0}
              onChange={(e) => set({ roommates: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            {t.knownRent}
            <input
              type="number"
              min={0}
              className={field}
              value={value.monthlyRent ?? ""}
              onChange={(e) => set({ monthlyRent: num(e.target.value) })}
            />
          </label>
          <label className="block">
            {t.tempNights}
            <input
              type="number"
              min={0}
              max={60}
              className={field}
              value={value.tempAccommodationNights ?? ""}
              onChange={(e) => set({ tempAccommodationNights: num(e.target.value) })}
            />
          </label>
          {(["furnished", "twelveMonthLease", "lastMonthUpfront"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={value[k] === true}
                onChange={(e) => set({ [k]: e.target.checked })}
              />
              {k === "furnished"
                ? t.furnished
                : k === "twelveMonthLease"
                  ? t.twelveMonthLease
                  : t.lastMonthUpfront}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
