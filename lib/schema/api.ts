import { z } from "zod";

export const ERROR_CODES = [
  "INVALID_INPUT",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "FORBIDDEN_ORIGIN",
  "DATA_UNAVAILABLE",
  "FEATURE_OFF",
  "BOT_CHECK_FAILED",
  "UPSTREAM_TIMEOUT",
  "INTERNAL",
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({ code: ErrorCodeSchema, message: z.string() });
export type ApiError = z.infer<typeof ApiErrorSchema>;
