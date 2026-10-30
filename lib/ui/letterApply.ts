import type { ExtractedField } from "@/lib/schema/ai";
import type { Term } from "./terms";

export type Degree = "undergrad" | "masters" | "other";

/** What applying confirmed letter fields changes on the form. Pure, so it is tested directly. */
export interface LetterPatch {
  tuitionDollars?: number;
  scholarshipDollars?: number;
  degree?: Degree;
  otherYears?: 1 | 2 | 3 | 4;
  term?: Term;
}

export function applyLetterFields(fields: ExtractedField[], availableTerms: Term[]): LetterPatch {
  const get = (name: ExtractedField["name"]) => fields.find((f) => f.name === name);
  const patch: LetterPatch = {};

  const tuition = get("tuitionPerYear")?.valueNumber;
  if (tuition !== null && tuition !== undefined)
    patch.tuitionDollars = tuition + (get("mandatoryFees")?.valueNumber ?? 0);

  const scholarship = get("scholarshipPerYear")?.valueNumber;
  if (scholarship !== null && scholarship !== undefined) patch.scholarshipDollars = scholarship;

  const years = get("programmeLengthYears")?.valueNumber;
  if (years === 4) patch.degree = "undergrad";
  else if (years === 2) patch.degree = "masters";
  else if (years === 1 || years === 3) {
    patch.degree = "other";
    patch.otherYears = years;
  }

  const start = get("startDate")?.valueText;
  const m = start ? /\b(fall|spring)\s+(20\d\d)\b/i.exec(start) : null;
  if (m) {
    const term: Term = {
      year: Number(m[2]),
      season: m[1]?.toLowerCase() === "fall" ? "fall" : "spring",
    };
    if (availableTerms.some((t) => t.year === term.year && t.season === term.season))
      patch.term = term;
  }
  return patch;
}
