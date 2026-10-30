# Security

True Cost is a public app that holds paid API keys and receives untrusted pasted text from
families planning a large spend. This document describes how it is protected and how to
report a problem.

## Reporting a problem

Email the maintainer listed in `package.json`, or open a private security advisory on the
GitHub repository. Please do not open a public issue for a security problem. You will get an
acknowledgement within a few days.

## Secrets

- All keys (`ANTHROPIC_API_KEY`, `DATA_GOV_API_KEY`, `HUD_API_TOKEN`, Upstash, Turnstile
  secret) are server-side environment variables, read only in `lib/server/env.ts`, which imports
  `server-only` so a client import fails the build. None is prefixed `NEXT_PUBLIC_` except the
  Turnstile site key, which is public by design.
- `.env.local` is gitignored. `.env.example` holds names only.
- A husky pre-commit hook runs `gitleaks git --staged`, and CI runs gitleaks on every push and
  pull request. Either finding blocks the commit or the build.
- Logs contain signal ids, statuses, timings, error codes and a request id. Never env values,
  request bodies, pasted text, URLs, wallet addresses or answers.

## Abuse and cost protection

- Every API route is rate-limited per IP in two tiers: general routes 30 a minute and 300 a
  day; AI routes 5 a minute and 30 a day. Upstash Redis in
  production (required unless `DEMO_MODE=true`), an in-memory limiter locally. Over the limit
  returns 429 with `Retry-After`.
- A Cloudflare Turnstile check runs on the AI routes only. A failed check skips the AI feature,
  never the estimate. A production deployment with AI configured must have Turnstile
  configured, or startup fails.
- AI calls are capped: 6,000 input characters, `max_tokens` on the response, a 10-second
  timeout, one retry. The model name comes from env. Every number the model returns is checked
  against the input in code; the model never produces a cost figure.
- Request bodies over 20 KB are rejected with 413. Every field is validated with zod; unknown
  fields are rejected.

## Untrusted input

- The app never fetches user-supplied URLs. Pasted letter text goes only to Anthropic, as data.
- Outbound requests go through `lib/server/http.ts`, which allows HTTPS to a fixed set of
  hosts (api.data.gov, www.huduser.gov, api.frankfurter.dev, api.anthropic.com,
  challenges.cloudflare.com), follows redirects by hand with every hop checked, and caps
  response bodies at 2 MB.
- Pasted text goes to the model inside delimited tags as data. The model has no tools, its
  output must match a strict zod schema, every extracted field must quote the input verbatim,
  and extracted values are shown for confirmation before use.
- Everything renders as text through React. `dangerouslySetInnerHTML` is forbidden by lint.

## Headers and platform

- `proxy.ts` sets a per-request Content-Security-Policy with a nonce: `default-src 'self'`,
  scripts nonce-only plus `challenges.cloudflare.com`, frames from that host only,
  `frame-ancestors 'none'`. `style-src` allows inline styles because the chart library sets
  element sizes inline; scripts remain strictly nonced, which is where the XSS risk lives.
- `next.config.ts` sets HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying camera,
  microphone and geolocation, and `X-Frame-Options: DENY` on every response.
- Mutating API routes accept POST only and reject cross-site requests (checked via
  `Sec-Fetch-Site` and `Origin`). Bodies over 20 KB are rejected.
- Vercel Preview deployments run with `DEMO_MODE=true` and no real keys. Production reads
  separate values.

## Dependencies

Versions are pinned by the lockfile. CI runs `npm audit --audit-level=high`. Dependabot opens
weekly update PRs for npm and GitHub Actions.
