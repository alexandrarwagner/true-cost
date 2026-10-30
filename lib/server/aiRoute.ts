import "server-only";
import type { z } from "zod";
import type { AiContext } from "@/lib/adapters/ai/types";
import { verifyBotToken } from "./botCheck";
import { AppError } from "./errors";
import { flags } from "./flags";
import { clientIp } from "./rateLimit";
import { assertSameOrigin, enforceRateLimit, readValidatedBody } from "./request";

/**
 * Everything an AI route checks before spending: same origin, the stricter "ai" rate tier,
 * the AI_ENABLED flag, a validated body, and the Turnstile token.
 */
export async function aiGate<S extends z.ZodType<{ botToken?: string | undefined }>>(
  req: Request,
  schema: S,
): Promise<{ body: z.infer<S>; ctx: AiContext }> {
  assertSameOrigin(req);
  await enforceRateLimit(req, "ai");
  if (!flags().AI_ENABLED) throw new AppError("FEATURE_OFF");
  const body = await readValidatedBody(req, schema);
  const requestId = crypto.randomUUID();
  const ok = await verifyBotToken(body.botToken, clientIp(req), requestId);
  if (!ok) throw new AppError("BOT_CHECK_FAILED");
  return { body, ctx: { signal: AbortSignal.timeout(12_000), requestId } };
}
