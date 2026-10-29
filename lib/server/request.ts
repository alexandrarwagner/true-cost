import "server-only";
import type { z } from "zod";
import { AppError } from "./errors";
import { clientIp, getRateLimiter, type Tier } from "./rateLimit";

export const MAX_BODY_BYTES = 20 * 1024;

/** Only this site may call the API. Browsers send Sec-Fetch-Site; older ones send Origin. */
export function assertSameOrigin(req: Request): void {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AppError("FORBIDDEN_ORIGIN");
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("host");
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("FORBIDDEN_ORIGIN");
    }
    if (!host || originHost !== host) throw new AppError("FORBIDDEN_ORIGIN");
  }
}

/** Enforce the per-IP limit for a tier, throwing RATE_LIMITED with a retry-after note. */
export async function enforceRateLimit(req: Request, tier: Tier): Promise<void> {
  const result = await getRateLimiter(tier).limit(`${tier}:${clientIp(req)}`);
  if (!result.ok) throw new AppError("RATE_LIMITED", String(result.retryAfterSeconds));
}

/** Read and validate a JSON body against a schema, with the 20 KB cap. */
export async function readValidatedBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new AppError("PAYLOAD_TOO_LARGE");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES)
    throw new AppError("PAYLOAD_TOO_LARGE");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError("INVALID_INPUT", "not_json");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AppError("INVALID_INPUT", "schema");
  return parsed.data as z.infer<S>;
}
