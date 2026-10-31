"use client";

import { copy } from "@/content/copy";
import type { SchoolSummary } from "@/lib/adapters/types";
import { MAX_COMPARE, type CompareSchool } from "@/lib/schema/compare";
import { SchoolSearch } from "./SchoolSearch";

/** One extra column in the form: a school and the tuition typed or taken from its listing. */
export interface CompareSlot {
  school: SchoolSummary | null;
  tuition: string;
  tuitionSource: "school" | "user";
}

export function slotsFrom(extras: CompareSchool[]): CompareSlot[] {
  return extras.map((e) => ({
    school: { ...e.school },
    tuition: String(e.tuitionPerYear),
    tuitionSource: e.tuitionSource,
  }));
}

interface Props {
  slots: CompareSlot[];
  onChange: (slots: CompareSlot[]) => void;
  aiEnabled: boolean;
  botToken: string | undefined;
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";

/** Up to two more schools (step 8). Shown only when COMPARE_ENABLED is on. */
export function ComparePicker({ slots, onChange, aiEnabled, botToken }: Props) {
  const t = copy.compare;
  const update = (i: number, patch: Partial<CompareSlot>) =>
    onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function choose(i: number, s: SchoolSummary | null) {
    if (!s) return update(i, { school: null });
    const listed = s.tuitionOutOfStateUsd;
    update(i, {
      school: s,
      ...(listed !== undefined
        ? { tuition: String(Math.round(listed / 100)), tuitionSource: "school" }
        : {}),
    });
  }

  return (
    <fieldset className="mt-6 border-t border-neutral-300 pt-4">
      <legend className="font-medium">{t.pickerHeading}</legend>
      <p className="mt-1 text-sm text-neutral-700">{t.pickerIntro}</p>
      {slots.map((slot, i) => {
        const n = i + 2;
        return (
          <div key={n} className="mt-4 border border-neutral-300 p-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`school-${n}`}>{t.schoolLabel(n)}</label>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => onChange(slots.filter((_, j) => j !== i))}
              >
                {t.remove}
                <span className="sr-only"> {t.schoolLabel(n)}</span>
              </button>
            </div>
            <SchoolSearch
              id={`school-${n}`}
              chosen={slot.school}
              onChoose={(s) => choose(i, s)}
              aiEnabled={aiEnabled}
              botToken={botToken}
            />
            <label className="mt-3 block">
              {t.tuitionLabel(n)}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className={field}
                value={slot.tuition}
                onChange={(e) => update(i, { tuition: e.target.value, tuitionSource: "user" })}
              />
            </label>
          </div>
        );
      })}
      {slots.length < MAX_COMPARE - 1 && (
        <p className="mt-3">
          <button
            type="button"
            className="border border-neutral-900 bg-white px-3 py-1 text-sm hover:bg-neutral-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900"
            onClick={() =>
              onChange([...slots, { school: null, tuition: "", tuitionSource: "user" }])
            }
          >
            {t.add}
          </button>
        </p>
      )}
    </fieldset>
  );
}
