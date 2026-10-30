import type { ExtractedField } from "@/lib/schema/ai";
import type { AiService } from "./types";
import { templateExplanation, validateExtraction } from "./validate";

// Fixture-grade AI for DEMO_MODE and tests: regexes over the letter, the template explanation,
// and a tiny nickname table. Goes through the same validators as the real adapter.

const MONEY = "\\$\\s?([\\d,]{3,})";
const PATTERNS: Array<{ name: ExtractedField["name"]; re: RegExp }> = [
  { name: "tuitionPerYear", re: new RegExp(`tuition[^$\\n]{0,60}${MONEY}`, "i") },
  {
    name: "mandatoryFees",
    re: new RegExp(`(?:mandatory|required|student) fees?[^$\\n]{0,40}${MONEY}`, "i"),
  },
  {
    name: "estimatedLivingCosts",
    re: new RegExp(`(?:living|room and board|housing)[^$\\n]{0,60}${MONEY}`, "i"),
  },
  {
    name: "scholarshipPerYear",
    re: new RegExp(`(?:scholarship|assistantship|award)[^$\\n]{0,60}${MONEY}`, "i"),
  },
];

const NICKNAMES: Record<string, string[]> = {
  ucla: ["University of California-Los Angeles"],
  nyu: ["New York University"],
  uiuc: ["University of Illinois Urbana-Champaign"],
  asu: ["Arizona State University Campus Immersion"],
  berkeley: ["University of California-Berkeley"],
  "purdue west lafayette": ["Purdue University-Main Campus"],
};

export const mockAi: AiService = {
  async extractLetter(text) {
    const fields: Array<{
      name: ExtractedField["name"];
      valueNumber: number | null;
      valueText: string | null;
      quote: string;
    }> = [];
    for (const { name, re } of PATTERNS) {
      const m = re.exec(text);
      if (m?.[1])
        fields.push({
          name,
          valueNumber: Number(m[1].replace(/,/g, "")),
          valueText: null,
          quote: m[0],
        });
    }
    const years = /(\d)[- ]year/i.exec(text);
    if (years?.[1])
      fields.push({
        name: "programmeLengthYears",
        valueNumber: Number(years[1]),
        valueText: null,
        quote: years[0],
      });
    const term = /\b(fall|spring)\s+(20\d\d)\b/i.exec(text);
    if (term)
      fields.push({ name: "startDate", valueNumber: null, valueText: term[0], quote: term[0] });
    return validateExtraction({ fields }, text);
  },
  async explain(input) {
    return templateExplanation(input);
  },
  async suggestSchools(query) {
    return NICKNAMES[query.trim().toLowerCase()] ?? [];
  },
};
