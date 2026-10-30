"use client";

import { copy } from "@/content/copy";
import type { Degree } from "@/lib/ui/letterApply";
import { termValue, type Term } from "@/lib/ui/terms";

interface Props {
  degree: Degree | null;
  onDegree: (d: Degree) => void;
  otherYears: 1 | 2 | 3 | 4;
  onOtherYears: (y: 1 | 2 | 3 | 4) => void;
  term: string;
  onTerm: (value: string) => void;
  terms: Term[];
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";

/** Programme length (a required quick pick, never silently defaulted) and start term. */
export function ProgrammeFields({
  degree,
  onDegree,
  otherYears,
  onOtherYears,
  term,
  onTerm,
  terms,
}: Props) {
  const t = copy.form;
  return (
    <>
      <fieldset className="mt-4">
        <legend>{t.degree}</legend>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              ["undergrad", t.degreeUndergrad],
              ["masters", t.degreeMasters],
              ["other", t.degreeOther],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name="degree"
                className="h-4 w-4"
                checked={degree === k}
                onChange={() => onDegree(k)}
              />
              {label}
            </label>
          ))}
          {degree === "other" && (
            <label className="flex items-center gap-2">
              {t.degreeOtherYears}
              <select
                className="border border-neutral-900 px-2 py-1"
                value={otherYears}
                onChange={(e) => onOtherYears(Number(e.target.value) as 1 | 2 | 3 | 4)}
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </fieldset>

      <label className="mt-4 block sm:w-1/2">
        {t.startTerm}
        <select
          id="startTerm"
          className={field}
          value={term}
          onChange={(e) => onTerm(e.target.value)}
        >
          {terms.map((tm) => (
            <option key={termValue(tm)} value={termValue(tm)}>
              {tm.season === "fall" ? t.fall : t.spring} {tm.year}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
