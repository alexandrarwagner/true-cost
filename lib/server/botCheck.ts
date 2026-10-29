import "server-only";
import { getEnv } from "@/lib/server/env";
import { log } from "./log";
import { safeFetch } from "./http";

const VERIFY_URL = new URL("https://challenges.cloudflare.com/turnstile/v0/siteverify");

/**
 * Verify a Cloudflare Turnstile token. Guards the AI call only; a failure skips the AI
 * analysis, never the whole check. Without a configured secret the check passes in dev
 * and demo mode and fails in production, so AI can't run unguarded there.
 */
export async function verifyBotToken(
  token: string | undefined,
  ip: string,
  requestId: string,
): Promise<boolean> {
  const env = getEnv();
  if (!env.turnstile.enabled || !env.turnstile.secretKey) return !env.isProd || env.isDemo;
  if (!token) return false;

  const started = Date.now();
  try {
    const body = new URLSearchParams({ secret: env.turnstile.secretKey, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await safeFetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      timeoutMs: 5000,
    });
    const json: unknown = await res.json();
    const ok =
      typeof json === "object" && json !== null && (json as { success?: unknown }).success === true;
    log.info("bot_check", { requestId, ok, ms: Date.now() - started });
    return ok;
  } catch {
    log.warn("bot_check_failed", { requestId, ms: Date.now() - started });
    return false;
  }
}
