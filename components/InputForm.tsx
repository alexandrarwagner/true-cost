"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { countryByCode, COUNTRIES } from "@/data/countries";
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
import { applyLetterFields } from "@/lib/ui/letterApply";
import { nextTerms, termValue } from "@/lib/ui/terms";
import { AccurateOptions } from "./AccurateOptions";
import { ComparePicker, slotsFrom, type CompareSlot } from "./ComparePicker";
import { InputBar } from "./InputBar";
import { LetterPaste } from "./LetterPaste";

type Options = NonNullable<EstimateRequestInput["options"]>;
type Years = 1 | 2 | 3 | 4;

interface Props {
  initial: EstimateRequest | null;
  /** Extra schools from a shared comparison link; empty unless COMPARE_ENABLED. */
  initialExtras: CompareSchool[];
  onSubmit: (req: EstimateRequest) => void;
  onCompare: (req: CompareRequest) => void;
  onExample: () => void;
  submitting: boolean;
  error: string | null;
  aiEnabled: boolean;
  compareEnabled: boolean;
  botToken: string | undefined;
}

const field = "mt-1 w-full rounded-[12px] border-[1.5px] border-line-strong bg-white px-3 py-2.5";

/** Years from a school's predominant degree (Scorecard: 3 = bachelor's, 4 = graduate). */
const yearsFromDegree = (predominant: number | undefined): Years | undefined =>
  predominant === 3 ? 4 : predominant === 4 ? 2 : undefined;

export function InputForm({
  initial,
  initialExtras,
  onSubmit,
  onCompare,
  onExample,
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
  const [years, setYears] = useState<Years>(initial?.degreeYears ?? 4);
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
    const y = yearsFromDegree(s.predominantDegree);
    if (y) setYears(y);
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
    if (patch.degree === "undergrad") setYears(4);
    else if (patch.degree === "masters") setYears(2);
    else if (patch.otherYears) setYears(patch.otherYears);
    if (patch.term) setTerm(termValue(patch.term));
  }

  function submit() {
    setLocalError(null);
    if (!school) return setLocalError(t.schoolRequired);
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
      degreeYears: years,
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
      className="container mt-8 scroll-mt-24 print:hidden"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <InputBar
        country={country}
        onCountry={chooseCountry}
        currency={currency}
        school={school}
        onSchool={chooseSchool}
        tuition={tuition}
        onTuition={(v) => {
          setTuition(v);
          setTuitionSource("user");
        }}
        tuitionHint={tuitionSource === "school" ? t.tuitionHintSchool : t.tuitionHintUser}
        years={years}
        onYears={setYears}
        submitting={submitting}
        onExample={onExample}
        aiEnabled={aiEnabled}
        botToken={botToken}
      />
      <p className="mt-2 min-h-5 text-center text-sm font-medium text-error" role="alert">
        {localError ?? error ?? ""}
      </p>

      <div className="mx-auto mt-3 max-w-[960px] space-y-5">
        <AccurateOptions value={options} onChange={setOptions}>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              {t.startTerm}
              <select
                id="startTerm"
                className={field}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                {terms.map((tm) => (
                  <option key={termValue(tm)} value={termValue(tm)}>
                    {tm.season === "fall" ? t.fall : t.spring} {tm.year}
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
              <span id="currency-hint" className="mt-1 block text-sm text-muted">
                {t.currencyHint}
              </span>
            </label>
          </div>
        </AccurateOptions>
        {aiEnabled && <LetterPaste botToken={botToken} onApply={applyLetter} />}
        {compareEnabled && (
          <ComparePicker
            slots={slots}
            onChange={setSlots}
            aiEnabled={aiEnabled}
            botToken={botToken}
          />
        )}
      </div>
    </form>
  );
}
