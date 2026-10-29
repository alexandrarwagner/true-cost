# ADR 008: Cloudflare Turnstile guards the AI routes

**Context.** The AI routes are the paid, abusable surface. The brief allows Turnstile or
Vercel BotID.

**Decision.** Turnstile, on the AI routes only, in addition to the stricter "ai" rate-limit
tier. A failed check skips the AI feature, never the estimate. In production with AI
configured the Turnstile keys are required at startup.

**Alternatives.** Vercel BotID (ties the project to one host; does not run locally).

**Consequences.** One extra script on the page, allowed by the CSP, and two env variables.
