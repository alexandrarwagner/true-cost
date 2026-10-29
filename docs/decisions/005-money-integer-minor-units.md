# ADR 005: Money is integer minor units, no money library

**Context.** Floating point is unacceptable for money. Candidates were a decimal library,
dinero.js, or plain integers.

**Decision.** All amounts are integers in minor units (US cents, Indian paise, Korean won
which has none) carried in branded TypeScript types `Cents` and `Minor`. Conversion happens in
one function that multiplies by a rate and rounds half-up to minor units immediately.
Integers are exact to 2^53, far beyond any tuition. No library.

**Alternatives.** dinero.js (around 1M weekly downloads, adds API surface for little gain
here); big.js (not published in over a year).

**Consequences.** Every arithmetic helper lives in `lib/core/money.ts` and is property-tested
with fast-check for round-trip and ordering invariants.
