import "server-only";
import { getEnv } from "./env";

// Every feature flag in one place. Values derive from env so a flag can be switched without
// a deploy; DEMO_MODE means fixtures only and no keys.
export interface Flags {
  AI_ENABLED: boolean;
  COMPARE_ENABLED: boolean;
  SAVINGS_ENABLED: boolean;
  DEMO_MODE: boolean;
}

export function flags(): Flags {
  const env = getEnv();
  return {
    AI_ENABLED: env.ai.enabled,
    COMPARE_ENABLED: env.compareEnabled,
    SAVINGS_ENABLED: env.savingsEnabled,
    DEMO_MODE: env.isDemo,
  };
}
