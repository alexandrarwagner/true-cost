import { z } from "zod";
import { EstimateRequestSchema, type EstimateRequest } from "./estimate";

// The /api/compare request (step 8, behind COMPARE_ENABLED): one set of shared inputs and
// two or three schools, each with its own tuition. Every column is an ordinary estimate.

export const MAX_COMPARE = 3;

const { school, tuitionPerYear, tuitionSource, ...shared } = EstimateRequestSchema.shape;

export const CompareSchoolSchema = z.strictObject({ school, tuitionPerYear, tuitionSource });
export type CompareSchool = z.infer<typeof CompareSchoolSchema>;
export type CompareSchoolInput = z.input<typeof CompareSchoolSchema>;

export const CompareRequestSchema = z.strictObject({
  ...shared,
  schools: z
    .array(CompareSchoolSchema)
    .min(2)
    .max(MAX_COMPARE)
    .refine((list) => new Set(list.map((s) => s.school.unitId)).size === list.length, {
      message: "duplicate_school",
    }),
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;
export type CompareRequestInput = z.input<typeof CompareRequestSchema>;

/** One ordinary estimate request per school, in the order given. */
export function toEstimateRequests(req: CompareRequest): EstimateRequest[] {
  const { schools, ...rest } = req;
  return schools.map((s) => ({ ...rest, ...s }));
}

/** The shared inputs plus the given schools, the inverse of `toEstimateRequests`. */
export function toCompareRequest(
  primary: EstimateRequest,
  extras: CompareSchool[],
): CompareRequestInput {
  const { school: s, tuitionPerYear: t, tuitionSource: ts, ...rest } = primary;
  return { ...rest, schools: [{ school: s, tuitionPerYear: t, tuitionSource: ts }, ...extras] };
}
