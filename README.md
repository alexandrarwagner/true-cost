# True Cost

An international student enters three things, where they're from, which US school, and the
tuition on their offer, and sees what the degree will really cost in their own currency: every
cost nobody mentions, when the money is needed, and how much the exchange rate has moved
totals over past periods of the same length. We never predict rates, every number has a source
and a date, and AI never invents a figure.

## Status

Build steps 2 to 6 are done: setup and security, the core engine, the wireframe UI, the real
adapters with snapshot scripts, and the AI features behind `AI_ENABLED` (letter extraction
with verbatim quotes, a checked plain-English explanation, and fuzzy school matching that
still resolves to a real UNITID). Hardening (step 7) follows.

## Quick start

Requires Node 24 (`.nvmrc`) and, for the pre-commit hook, [gitleaks](https://github.com/gitleaks/gitleaks)
(`brew install gitleaks`).

```bash
npm ci
cp .env.example .env.local   # DEMO_MODE=true runs on fixtures with no keys
npm run dev
```

## Scripts

| Script                                                        | What it does                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start`                 | Development server; production build and server                                   |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Static checks (all run in CI)                                                     |
| `npm test`                                                    | Unit, property, golden, adapter (mocked HTTP) and AI-contract tests               |
| `npm run test:e2e`                                            | Playwright flow tests with an axe scan, against the production build in DEMO_MODE |
| `npm run check:constants`                                     | Fails if any constant in `data/constants.ts` is older than 180 days (step 3)      |

## Keys

Without `DEMO_MODE`, school search needs `DATA_GOV_API_KEY` (free at api.data.gov); cost
fields and rent come from the snapshots in `data/snapshots/`, falling back to live calls when
the key or `HUD_API_TOKEN` is set. Exchange rates need no key. The AI features (step 6) need
`ANTHROPIC_API_KEY`. In production, Upstash and Turnstile are required too (see
`.env.example`).

## Documentation

- `docs/data-sources.md`: every source, what was verified, licence and refresh.
- `docs/decisions/`: Architecture Decision Records.
- `SECURITY.md`: threat model, protections, how to report a problem.
- `docs/ARCHITECTURE.md` and `docs/cost-model.md` arrive with the engine in step 3.
