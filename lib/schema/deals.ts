import { z } from "zod";
import { COST_LINE_IDS } from "@/lib/core/deals";

// The shape of every file under data/deals. Strict: a typo in a hand-edited deal fails the
// check script and the unit tests rather than hiding a deal or showing a wrong one.

const MoneySchema = z.strictObject({
  amount: z.number().int().min(0).max(10_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const DealSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
    title: z.string().trim().min(3).max(120),
    scope: z.enum(["school", "city", "national"]),
    category: z.enum([
      "transport",
      "fitness",
      "culture",
      "software",
      "subscriptions",
      "phone",
      "food",
      "other",
    ]),
    costLine: z.enum(COST_LINE_IDS).optional(),
    studentPrice: MoneySchema.optional(),
    regularPrice: MoneySchema.optional(),
    period: z.enum(["month", "year", "once"]).optional(),
    eligibility: z.string().trim().min(3).max(300),
    howToGet: z.string().trim().min(3).max(400),
    sourceUrl: z.url().startsWith("https://").max(500),
    sourceQuote: z.string().trim().min(10).max(600),
    checkedOn: z.iso.date(),
    status: z.enum(["approved", "pending", "rejected", "expired"]),
  })
  .refine((d) => (d.studentPrice === undefined) === (d.regularPrice === undefined), {
    message: "Give both prices from the source, or neither",
  })
  .refine((d) => d.studentPrice === undefined || d.period !== undefined, {
    message: "A priced deal needs a period",
  })
  .refine(
    (d) =>
      !d.studentPrice || !d.regularPrice || d.studentPrice.currency === d.regularPrice.currency,
    { message: "Both prices must be in the same currency" },
  );

const deals = z.array(DealSchema).max(200);

export const SchoolDealsFileSchema = z.strictObject({
  unitId: z.number().int().positive(),
  school: z.string().trim().min(1).max(200),
  deals,
});
export const CityDealsFileSchema = z.strictObject({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().length(2),
  deals,
});
export const NationalDealsFileSchema = z.strictObject({ deals });

/** A research output under data/deals/review: where its deals would go once approved. */
export const ReviewTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("national") }),
  z.strictObject({
    kind: z.literal("city"),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().length(2),
  }),
  z.strictObject({
    kind: z.literal("school"),
    unitId: z.number().int().positive(),
    school: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().length(2),
  }),
]);
export type ReviewTarget = z.infer<typeof ReviewTargetSchema>;
export const ReviewFileSchema = z.strictObject({ target: ReviewTargetSchema, deals });

export const SchoolLinksSchema = z.record(
  z.string().regex(/^\d+$/),
  z.strictObject({ url: z.url().startsWith("https://").max(500) }),
);
