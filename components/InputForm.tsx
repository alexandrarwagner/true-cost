"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { countryByCode } from "@/data/countries";
import type { SchoolSummary } from "@/lib/adapters/types";
import {
  CompareRequestSchema,
  toCompareRequest,
  type CompareRequest,
  type CompareSchool,
} from "@/lib/schema/compare";
import {
  EstimateRequestSchema,
  type EstimateRequest,
  type EstimateRequestInput,
} from "@/lib/schema/estimate";
import type { ExtractedField } from "@/lib/schema/ai";
import { applyLetterFields, type Degree } from "@/lib/ui/letterApply";
import { nextTerms, termValue } from "@/lib/ui/terms";
import { AccurateOptions } from "./AccurateOptions";
import { ComparePicker, slotsFrom, type CompareSlot } from "./ComparePicker";
import { ProgrammeFields } from "./ProgrammeFields";
import { LetterPaste } from "./LetterPaste";
import { OriginFields } from "./OriginFields";
import { SchoolSearch } from "./SchoolSearch";

type Options = NonNullable<EstimateRequestInput["options"]>;

interface Props {
  initial: EstimateRequest | null;
  /** Extra schools from a shared comparison link; empty unless COMPARE_ENABLED. */
  initialExtras: CompareSchool[];
  onSubmit: (req: EstimateRequest) => void;
  onCompare: (req: CompareRequest) => void;
  submitting: boolean;
  error: string | null;
  aiEnabled: boolean;
  compareEnabled: boolean;
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

export function InputForm({
  initial,
  initialExtras,
  onSubmit,
  onCompare,
  submitting,
  error,
  aiEnabled,
  compareEnabled,
  botToken,
}: Props) {
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
  const [slots, setSlots] = useState<CompareSlot[]>(slotsFrom(initialExtras));
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
    const extras = compareEnabled ? slots.filter((s) => s.school !== null) : [];
    if (extras.length === 0) return onSubmit(parsed.data);
    const compare = CompareRequestSchema.safeParse(
      toCompareRequest(
        parsed.data,
        extras.map((s) => {
          const { unitId, name, city, state, zip } = s.school as SchoolSummary;
          return {
            school: { unitId, name, city, state, zip },
            tuitionPerYear: Number(s.tuition),
            tuitionSource: s.tuitionSource,
          };
        }),
      ),
    );
    if (!compare.success) return setLocalError(copy.errors.INVALID_INPUT);
    onCompare(compare.data);
  }

  return (
    <form
      id="estimate"
      className="print:hidden"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-neutral-700">{t.intro}</p>

      <OriginFields
        country={country}
        onCountry={chooseCountry}
        currency={currency}
        onCurrency={setCurrency}
      />

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
      {compareEnabled && (
        <ComparePicker
          slots={slots}
          onChange={setSlots}
          aiEnabled={aiEnabled}
          botToken={botToken}
        />
      )}

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
