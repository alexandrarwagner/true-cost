# 016. The designer's HTML is the front end; the engine is a headless module behind TPEngine

Date: 2026-11-02. Status: accepted.

## Context

The home page was rebuilt twice in React from the designer's boards and drifted both times:
values were rounded to utility classes, the width axis of the typeface was dropped for
performance, animations were re-created rather than copied, and sections appeared that the
boards never had. The designer's own HTML page (`design/wired/E-homepage-wired.html`) already
had the layout, the motion and the copy right; only its numbers were a prototype's.

## Decision

The designer's HTML is served as the home page, as written. A route handler (`app/route.ts`)
returns the file with one serve-time change, the per-request script nonce the security policy
needs. Every number on the page comes from one object, `window.TPEngine`, built by esbuild from
the same pure engine (`lib/core`) that the server-rendered pages use (`public/engine.js`,
about 60 KB). Data that needs keys stays behind API routes: the school's costs and rent
(`/api/context`), today's rate and the daily history (`/api/fx/history`), the school search
(`/api/schools/search`) and the approved deals (`/api/deals`).

The page may change only in the ways the owner listed and approved: inline scripts moved into
files, currency formatting generalised, rupee-only gates removed, card labels driven by the
engine's confidence, six copy fixes with the deals rendered from data, and the PDF library
loaded on click. A design lock (`tests/design/lock.test.ts`) compares the page with the file as
delivered plus exactly those edits (`tests/design/allowed-diffs.json`); a pixel comparison and
a computed-style check (`tests/e2e/design.spec.ts`) run against the served page with the
prototype's numbers (`?engine=prototype`, outside production or in demo mode).

The React home page is retired. The shared page (`/r`), the full calculation
(`/estimate/breakdown`) and `/privacy` stay server-rendered React, sharing the engine, the copy
and the data adapters with the home page.

## Consequences

- `style-src` keeps `'unsafe-inline'`: the design is carried by 231 inline `style` attributes.
  Inline styles cannot run code; scripts stay nonce-only with `strict-dynamic`, so the policy's
  protection against injected scripts is unchanged.
- Fonts are served from this site (`public/fonts`), not Google Fonts, which the policy and the
  privacy page rule out.
- Two engines must agree: a contract test runs the same inputs through `runEstimate()` and
  through the bundle and asserts the same totals, and the page's figures link to the full
  calculation built from the same engine.
- Features that lived only in the React home page (the "make it more accurate" options, the
  letter reader, the comparison picker, the savings switches) have no home-page UI until the
  designer adds one; the shared page keeps the levers as links.
- Share links of the form `/?c=…` redirect to the shared page; the home page does not read the
  query string yet, so "Edit" from the shared page opens an empty form (plan decision 12).
- The pixel baselines are per platform (`design/reference/screens-served/<platform>`); a change
  to the page's markup means re-capturing them, on macOS here and on Linux from the CI
  artifact.
