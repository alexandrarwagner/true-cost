import type { ExtractedField } from "@/lib/schema/ai";

export interface AiContext {
  signal: AbortSignal;
  requestId: string;
}

/** Named, pre-formatted numbers the explanation may use, and nothing else. */
export interface ExplainInput {
  school: string;
  currency: string;
  years: string;
  totalUsd: string;
  tuitionUsd: string;
  hiddenPercent: string;
  baselineHome: string | null;
  best10Home: string | null;
  worst10Home: string | null;
  worstPeriod: string | null;
}

export interface AiService {
  extractLetter(text: string, ctx: AiContext): Promise<ExtractedField[] | null>;
  explain(input: ExplainInput, ctx: AiContext): Promise<string | null>;
  suggestSchools(query: string, ctx: AiContext): Promise<string[]>;
}
