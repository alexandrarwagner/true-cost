import { z } from "zod";
import { COUNTRIES } from "@/data/countries";

// The /api/estimate request. Money arrives in whole dollars from the form and is converted
// to cents at the service boundary. Unknown keys are rejected: the body is untrusted.

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const CURRENCIES = [...COUNTRIES.map((c) => c.currency), "USD"] as unknown as [string, ...string[]];

const dollars = (max: number) => z.number().min(0).max(max);

export const HousingSchema = z.strictObject({
  kind: z.enum(["on_campus", "off_campus"]),
  bedrooms: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .default(1),
  roommates: z.number().int().min(0).max(6).default(0),
  monthlyRent: dollars(20_000).optional(),
  furnished: z.boolean().optional(),
  lastMonthUpfront: z.boolean().optional(),
  twelveMonthLease: z.boolean().optional(),
  tempAccommodationNights: z.number().int().min(0).max(60).optional(),
});

export const OptionsSchema = z.strictObject({
  housing: HousingSchema.optional(),
  scholarshipPerYear: dollars(300_000).optional(),
  insurance: z
    .strictObject({
      kind: z.enum(["school_plan", "waiver"]),
      premiumPerYear: dollars(30_000).optional(),
    })
    .optional(),
  flights: z
    .strictObject({
      tripsHomePerYear: z.number().int().min(0).max(6),
      oneWay: dollars(10_000).optional(),
    })
    .optional(),
  transfer: z
    .strictObject({ markupBps: z.number().int().min(0).max(2_000), fixedFee: dollars(500) })
    .optional(),
  payFromUsd: z.boolean().optional(),
  dependants: z.number().int().min(0).max(6).optional(),
  enrolmentDeposit: dollars(50_000).optional(),
});

export const EstimateRequestSchema = z.strictObject({
  countryCode: z.enum(COUNTRY_CODES),
  homeCurrency: z.enum(CURRENCIES),
  school: z.strictObject({
    unitId: z.number().int().positive(),
    name: z.string().trim().min(1).max(200),
    city: z.string().trim().max(100),
    state: z.string().trim().length(2),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}$/),
  }),
  tuitionPerYear: dollars(500_000),
  tuitionSource: z.enum(["school", "user"]).default("user"),
  degreeYears: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  startTerm: z.strictObject({
    year: z.number().int().min(2025).max(2035),
    season: z.enum(["fall", "spring"]),
  }),
  options: OptionsSchema.default({}),
});
export type EstimateRequest = z.infer<typeof EstimateRequestSchema>;
export type EstimateRequestInput = z.input<typeof EstimateRequestSchema>;

export const SchoolSearchQuerySchema = z.strictObject({ q: z.string().trim().min(2).max(100) });
export const FxLatestQuerySchema = z.strictObject({ currency: z.enum(CURRENCIES) });
