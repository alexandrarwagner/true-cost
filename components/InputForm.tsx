"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { COUNTRIES, countryByCode } from "@/data/countries";
import type { SchoolSummary } from "@/lib/adapters/types";
import {
  EstimateRequestSchema,
  type EstimateRequest,
  type EstimateRequestInput,
} from "@/lib/schema/estimate";
import type { ExtractedField } from "@/lib/schema/ai";
import { applyLetterFields, type Degree } from "@/lib/ui/letterApply";
import { nextTerms, termValue } from "@/lib/ui/terms";
import { AccurateOptions } from "./AccurateOptions";
import { ProgrammeFields } from "./ProgrammeFields";
import { LetterPaste } from "./LetterPaste";
import { SchoolSearch } from "./SchoolSearch";

type Options = NonNullable<EstimateRequestInput["options"]>;

interface Props {
  initial: EstimateRequest | null;
  onSubmit: (req: EstimateRequest) => void;
  submitting: boolean;
  error: string | null;
  aiEnabled: boolean;
  botToken: string | undefined;
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";
const button =
  "border border-neutral-900 bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900 disabled:opacity-60";

function degreeFrom(req: EstimateRequest | null): Degree | null {
  if (!req) return null;
  return req.degreeYears === 4 ? "undergrad" : req.degreeYears === 2 ? "masters" : "other";
}

export function InputForm({ initial, onSubmit, submitting, error, aiEnabled, botToken }: Props) {
  const t = copy.form;
  const terms = nextTerms(new Date());
  const [country, setCountry] = useState(initial?.countryCode ?? "IN");
  const [currency, setCurrency] = useState(initial?.homeCurrency ?? "INR");
  const [school, setSchool] = useState<SchoolSummary | null>(
    initial ? { ...initial.school } : null,
  );
  const [tuition, setTuition] = useState(initial ? String(initial.tuitionPerYear) : "");
  const [tuitionSource, setTuitionSource] = useState<"school" | "user">(
    initial?.tuitionSource ?? "user",
  );
  const [degree, setDegree] = useState<Degree | null>(degreeFrom(initial));
  const [otherYears, setOtherYears] = useState<1 | 2 | 3 | 4>(
    initial && initial.degreeYears !== 2 && initial.degreeYears !== 4 ? initial.degreeYears : 1,
  );
  const [term, setTerm] = useState(
    initial
      ? `${initial.startTerm.year}-${initial.startTerm.season}`
      : terms[0]
        ? termValue(terms[0])
        : "",
  );
  const [options, setOptions] = useState<Options>(initial?.options ?? {});
  const [localError, setLocalError] = useState<string | null>(null);

  function chooseCountry(code: string) {
    setCountry(code);
    const c = countryByCode(code);
    if (c) setCurrency(c.currency);
  }

  function chooseSchool(s: SchoolSummary | null) {
    setSchool(s);
    if (!s) return;
    if (s.tuitionOutOfStateUsd !== undefined) {
      setTuition(String(Math.round(s.tuitionOutOfStateUsd / 100)));
      setTuitionSource("school");
    }
    if (s.predominantDegree === 3) setDegree("undergrad");
    else if (s.predominantDegree === 4) setDegree("masters");
  }

  function applyLetter(fields: ExtractedField[]) {
    const patch = applyLetterFields(fields, terms);
    if (patch.tuitionDollars !== undefined) {
      setTuition(String(patch.tuitionDollars));
      setTuitionSource("user");
    }
    if (patch.scholarshipDollars !== undefined) {
      const scholarshipPerYear = patch.scholarshipDollars;
      setOptions((o) => ({ ...o, scholarshipPerYear }));
    }
    if (patch.degree) setDegree(patch.degree);
    if (patch.otherYears) setOtherYears(patch.otherYears);
    if (patch.term) setTerm(termValue(patch.term));
  }

  function submit() {
    setLocalError(null);
    if (!school) return setLocalError(t.schoolRequired);
    if (!degree) return setLocalError(t.degreeRequired);
    const [year, season] = term.split("-");
    const candidate: EstimateRequestInput = {
      countryCode: country,
      homeCurrency: currency,
      school: {
        unitId: school.unitId,
        name: school.name,
        city: school.city,
        state: school.state,
        zip: school.zip,
      },
      tuitionPerYear: Number(tuition),
      tuitionSource,
      degreeYears: (degree === "undergrad" ? 4 : degree === "masters" ? 2 : otherYears) as
        1 | 2 | 3 | 4,
      startTerm: { year: Number(year), season: season as "fall" | "spring" },
      options,
    };
    const parsed = EstimateRequestSchema.safeParse(candidate);
    if (!parsed.success) return setLocalError(copy.errors.INVALID_INPUT);
    onSubmit(parsed.data);
  }

  return (
    <form
      className="print:hidden"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-neutral-700">{t.intro}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          {t.country}
          <select
            id="country"
            className={field}
            value={country}
            onChange={(e) => chooseCountry(e.target.value)}
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
            onChange={(e) => setCurrency(e.target.value)}
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

      <div className="mt-4">
        <label htmlFor="school" className="block">
          {t.school}
        </label>
        <SchoolSearch
          chosen={school}
          onChoose={chooseSchool}
          aiEnabled={aiEnabled}
          botToken={botToken}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="tuition" className="block">
          {t.tuition}
        </label>
        <input
          id="tuition"
          type="number"
          min={0}
          inputMode="numeric"
          className={field}
          value={tuition}
          onChange={(e) => {
            setTuition(e.target.value);
            setTuitionSource("user");
          }}
          aria-describedby="tuition-hint"
        />
        <p id="tuition-hint" className="mt-1 text-sm text-neutral-700">
          {tuitionSource === "school" ? t.tuitionHintSchool : t.tuitionHintUser}
        </p>
      </div>

      <ProgrammeFields
        degree={degree}
        onDegree={setDegree}
        otherYears={otherYears}
        onOtherYears={setOtherYears}
        term={term}
        onTerm={setTerm}
        terms={terms}
      />

      <AccurateOptions value={options} onChange={setOptions} />
      {aiEnabled && <LetterPaste botToken={botToken} onApply={applyLetter} />}

      <p className="mt-4 text-sm font-medium" role="alert">
        {localError ?? error ?? ""}
      </p>
      <p className="mt-2">
        <button type="submit" className={button} disabled={submitting} aria-busy={submitting}>
          {submitting ? t.submitting : t.submit}
        </button>
      </p>
    </form>
  );
}
