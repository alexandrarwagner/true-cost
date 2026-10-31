# 012. A comparison is two or three ordinary estimates

Status: accepted, 2026-10-30 (step 8)

## Context

The stretch goal shows up to three schools side by side in the student's currency. The
single-school estimate already has an engine, a share URL, a server-rendered page and tests
that enforce the principles (no prediction, a source on every number).

## Decision

`/api/compare` takes one set of shared inputs (country, currency, programme length, start
term, options) and two or three schools, each with its own tuition. The service splits that
into ordinary estimate requests and runs `runEstimate` for each in parallel, sharing one
exchange-rate lookup. The response is the full estimate per column; the table reads totals
off them and the first school's full breakdown renders underneath, unchanged.

The share URL is the first school's existing params plus the extra schools with a numeric
suffix (`s2`, `sn2`, ... `ts3`). A reader that knows nothing about comparison still decodes
the first school, so an old link, or a comparison link opened while the flag is off, shows a
single result instead of an error.

The feature sits behind `COMPARE_ENABLED` (default off) and answers 404 `FEATURE_OFF` when
off. The "lowest" badge is a fact about the totals at today's rate, not a recommendation.

## Consequences

- No new engine code and no new invariants to prove: every column is covered by the existing
  property and golden tests.
- A comparison costs up to three school and rent lookups per request under the general rate
  tier. Acceptable at three; the cap is a constant (`MAX_COMPARE`).
- Each column degrades on its own and says so under the table.
