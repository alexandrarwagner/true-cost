import { z } from "zod";
import { EstimateRequestSchema } from "./estimate";

// AI contracts. Output schemas are strict; anything else is rejected in code.

export const MAX_LETTER_CHARS = 6000;

export const LETTER_FIELDS = [
  "tuitionPerYear",
  "mandatoryFees",
  "estimatedLivingCosts",
  "scholarshipPerYear",
  "programmeLengthYears",
  "startDate",
] as const;
export const LetterFieldSchema = z.enum(LETTER_FIELDS);
export type LetterField = z.infer<typeof LetterFieldSchema>;

/** The model's extraction output. Money and years in valueNumber, dates as text in valueText. */
export const LetterExtractionSchema = z.strictObject({
  fields: z
    .array(
      z.strictObject({
        name: LetterFieldSchema,
        valueNumber: z.number().nullable(),
        valueText: z.string().max(60).nullable(),
        quote: z.string().min(3).max(300),
      }),
    )
    .max(12),
});
export type LetterExtraction = z.infer<typeof LetterExtractionSchema>;

/** What the app keeps after checking quotes: one value per field. */
export const ExtractedFieldSchema = z.strictObject({
  name: LetterFieldSchema,
  valueNumber: z.number().nullable(),
  valueText: z.string().nullable(),
  quote: z.string(),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export const ExplanationSchema = z.strictObject({ text: z.string().min(20).max(900) });

export const SchoolSuggestionsSchema = z.strictObject({
  names: z.array(z.string().min(3).max(120)).max(10),
});

// Route requests
export const ExtractRequestSchema = z.strictObject({
  text: z.string().trim().min(20).max(MAX_LETTER_CHARS),
  botToken: z.string().max(4096).optional(),
});
export const ExplainRequestSchema = z.strictObject({
  request: EstimateRequestSchema,
  botToken: z.string().max(4096).optional(),
});
export const MatchRequestSchema = z.strictObject({
  q: z.string().trim().min(3).max(100),
  botToken: z.string().max(4096).optional(),
});
