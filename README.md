# Tuition+

An international student enters three things, where they're from, which US school, and the
tuition on their offer, and sees what the degree will really cost in their own currency: every
cost nobody mentions, when the money is needed, and how much the exchange rate has moved
totals over past periods of the same length. We never predict rates, every number has a source
and a date, and AI never invents a figure.

## Status

The home page is the designer's own HTML, served as written, with every number coming from
the cost engine bundled for the browser (ADR 016). Behind it: the engine, the adapters and the
hardening from the original brief; the savings levers and student deals; the shared page and
the full-calculation page built from the engine's derivation traces; a design lock, a pixel
comparison and a computed-style check that keep the page as the designer delivered it; and the
accessibility, print and Lighthouse checks in CI. Still to come: the deals research and review
scripts with the weekly freshness job (savings brief steps 5 and 6), and the open decisions in
`docs/proposals/2026-11-01-wired-page-plan.md`. `COMPARE_ENABLED` and `SAVINGS_ENABLED` stay
off in production until their copy has been reviewed.

## The home page

`design/wired/E-homepage-wired.html` is the front end. `app/route.ts` serves it at `/` with the
security nonce on each script tag; its scripts live under `design/wired` and are served by
`app/wired/[...path]/route.ts`. `lib/browser` is the engine behind `window.TPEngine`, bundled
to `public/engine.js` by `scripts/build-engine.mjs` before every build. The page may change only
by the edits listed in `tests/design/allowed-diffs.json`; `npm test` fails on any other
difference from `tests/design/baseline.html`. With `?engine=prototype` (not in production) the
page runs on the prototype's fixed numbers, which is how the pixel comparison in
`tests/e2e/design.spec.ts` sees the design unchanged.

## Quick start

Requires Node 24 (`.nvmrc`) and, for the pre-commit hook, [gitleaks](https://github.com/gitleaks/gitleaks)
(`brew install gitleaks`).

```bash
npm ci
cp .env.example .env.local   # DEMO_MODE=true runs on fixtures with no keys
npm run dev
```

## Scripts

| Script                                                        | What it does                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start`                 | Development server; production build and server                                                                           |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Static checks (all run in CI)                                                                                             |
| `npm test`                                                    | Unit, property, golden, adapter, AI-contract, engine-contract and design-lock tests                                       |
| `npm run test:e2e`                                            | Playwright: the home page (real engine, pixel and style checks), shared page and full calculation, with axe, in DEMO_MODE |
| `npm run check:constants`                                     | Fails if any constant in `data/constants.ts` is older than 180 days (step 3)                                              |
| `npm run check:deals`                                         | Validates every file under `data/deals` and lists approved deals past 90 days                                             |
| `npm run perf`                                                | Lighthouse on a phone profile against a running server, gated at 90 (CI)                                                  |
| `npm run build:engine`                                        | Bundles the browser engine to `public/engine.js` (also runs before `npm run build`)                                       |

## Keys

Without `DEMO_MODE`, school search needs `DATA_GOV_API_KEY` (free at api.data.gov); cost
fields and rent come from the snapshots in `data/snapshots/`, falling back to live calls when
the key or `HUD_API_TOKEN` is set. Exchange rates need no key. The AI features (step 6) need
`ANTHROPIC_API_KEY`. In production, Upstash and Turnstile are required too (see
`.env.example`).

## Deployment (Vercel)

1. Import the repository. The build is `next build`; no extra configuration.
2. **Preview** environment: `DEMO_MODE=true`, no keys. Every pull request gets a working preview
   on fixtures.
3. **Production** environment: `DEMO_MODE=false`, `DATA_GOV_API_KEY`, the Upstash pair,
   `ANTHROPIC_API_KEY` with the Turnstile pair, and `HUD_API_TOKEN` if rent should fall back to
   live calls. Use different keys for preview and production. The server refuses to start with a
   required variable missing and names it.
4. Add `DATA_GOV_API_KEY` and `HUD_API_TOKEN` as GitHub Actions secrets so the weekly snapshot
   refresh covers all three sources.
5. `GET /api/health` reports flags, configured services (booleans) and snapshot freshness.

## Manual checklist

Things only an account owner can do, in the order they matter:

- [ ] api.data.gov key, then `npm run snapshot:scorecard` and commit the result.
- [ ] HUD User token, then `npm run snapshot:hud -- --only IN`; if zero areas parse, adjust the
      field names in `lib/adapters/hud.ts` (see docs/data-sources.md).
- [ ] Anthropic key with a spend limit and an alert set in the console; paste one real offer
      letter and check the extraction.
- [ ] Upstash Redis database and Cloudflare Turnstile site for production.
- [ ] GitHub: secret scanning and push protection on; branch protection on `main`.
- [ ] Read Frankfurter's licence page and confirm the commercial-use wording (ADR 002).
- [ ] Review every estimate in `data/constants.ts` and update `checkedOn`.

## Documentation

- `docs/data-sources.md`: every source, what was verified, licence and refresh.
- `docs/decisions/`: Architecture Decision Records (016: the designer's HTML is the front end).
- `docs/proposals/2026-11-01-wired-page-plan.md`: the plan behind the home page, with what
  changed on the way and the decisions still open.
- `SECURITY.md`: threat model, protections, how to report a problem.
- `docs/ARCHITECTURE.md` and `docs/cost-model.md` arrive with the engine in step 3.
