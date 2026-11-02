import { z } from "zod";
import { CURRENCIES } from "./estimate";

/** /api/context: the chosen school's figures and the rent for its area. */
export const ContextQuerySchema = z.strictObject({
  unitId: z.coerce.number().int().min(1).max(99_999_999),
  zip: z.string().trim().max(10),
  state: z.string().trim().length(2),
  city: z.string().trim().max(80),
});

/** /api/fx/history: today's rate and the daily history behind the exchange-rate range. */
export const FxHistoryQuerySchema = z.strictObject({ currency: z.enum(CURRENCIES) });
