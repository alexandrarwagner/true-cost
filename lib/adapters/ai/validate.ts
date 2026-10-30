import {
  ExplanationSchema,
  LetterExtractionSchema,
  SchoolSuggestionsSchema,
  type ExtractedField,
  type LetterField,
} from "@/lib/schema/ai";
import type { ExplainInput } from "./types";

// Pure checks between the model and the app. The model is never trusted on its own:
// every extracted field must quote the letter verbatim, every number in an explanation
// must already be in the inputs, and anything that fails parses to null.

function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

const NUMERIC_FIELDS: ReadonlySet<LetterField> = new Set([
  "tuitionPerYear",
  "mandatoryFees",
  "estimatedLivingCosts",
  "scholarshipPerYear",
  "programmeLengthYears",
]);

/**
 * Keep only fields whose quote appears verbatim in the letter and whose numeric value is
 * visible inside that quote. One field per name; the first valid one wins.
 */
export function validateExtraction(raw: unknown, letter: string): ExtractedField[] | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = LetterExtractionSchema.safeParse(value);
  if (!parsed.success) return null;
  const haystack = normalise(letter);
  const seen = new Set<LetterField>();
  const out: ExtractedField[] = [];
  for (const f of parsed.data.fields) {
    if (seen.has(f.name)) continue;
    const q = normalise(f.quote);
    if (q.length < 3 || !haystack.includes(q)) continue;
    if (NUMERIC_FIELDS.has(f.name)) {
      if (f.valueNumber === null || !Number.isFinite(f.valueNumber) || f.valueNumber < 0) continue;
      const needle = digits(String(Math.round(f.valueNumber)));
      if (needle.length === 0 || !digits(f.quote).includes(needle)) continue;
      out.push({
        name: f.name,
        valueNumber: Math.round(f.valueNumber),
        valueText: null,
        quote: f.quote,
      });
    } else {
      if (!f.valueText || !haystack.includes(normalise(f.valueText))) continue;
      out.push({ name: f.name, valueNumber: null, valueText: f.valueText, quote: f.quote });
    }
    seen.add(f.name);
  }
  return out;
}

/** Every digit run in the text must equal a digit run from the allowed inputs. */
export function allowedDigitRuns(input: ExplainInput): Set<string> {
  const runs = new Set<string>(["10"]); // "best/worst tenth" and "10%" are part of the framing
  for (const v of Object.values(input)) {
    if (typeof v !== "string") continue;
    for (const m of v.match(/\d[\d,.]*/g) ?? []) {
      const d = digits(m);
      if (d) runs.add(d);
      // "71.5 lakh" may be written as 71.5 or 71,50,000-style; keep the integer part too.
      const intPart = m.split(/[.,]/)[0];
      if (intPart) runs.add(digits(intPart));
    }
  }
  return runs;
}

export function validateExplanation(raw: unknown, input: ExplainInput): string | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      value = { text: raw };
    }
  }
  const parsed = ExplanationSchema.safeParse(value);
  if (!parsed.success) return null;
  const text = parsed.data.text.trim();
  if (
    /\b(will|forecast|forecasts|expected|predicts?|recommend|should (use|choose|pick))\b/i.test(
      text,
    )
  )
    return null;
  const allowed = allowedDigitRuns(input);
  for (const m of text.match(/\d[\d,.]*/g) ?? []) {
    const d = digits(m);
    if (d && !allowed.has(d)) return null;
  }
  return text;
}

export function validateSuggestions(raw: unknown): string[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const parsed = SchoolSuggestionsSchema.safeParse(value);
  if (!parsed.success) return [];
  return [...new Set(parsed.data.names.map((n) => n.trim()).filter((n) => n.length >= 3))].slice(
    0,
    3,
  );
}

/** The explanation we show when AI is off, fails validation, or the user has no JavaScript. */
export function templateExplanation(input: ExplainInput): string {
  const sentences = [
    `Over ${input.years} at ${input.school}, the estimate comes to ${input.totalUsd}, of which tuition is ${input.tuitionUsd}.`,
    `Costs beyond tuition add ${input.hiddenPercent} on top.`,
  ];
  if (input.baselineHome && input.best10Home && input.worst10Home) {
    sentences.push(
      `At today's rate that is about ${input.baselineHome} in ${input.currency}; over past periods of the same length it ranged from ${input.best10Home} to ${input.worst10Home}.`,
    );
  }
  if (input.worstPeriod)
    sentences.push(`The worst stretch was ${input.worstPeriod}. This is not a prediction.`);
  return sentences.join(" ");
}
