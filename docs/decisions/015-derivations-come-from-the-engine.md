# 015. Derivations are produced by the engine, not reconstructed

Date: 2026-11-01. Status: accepted.

## Context

The full-calculation page shows the formula behind every figure with the user's own numbers:
"$3,100 a month ÷ 3 people × 20 months = $20,667". If the page rebuilt those sentences from
the inputs, a change to the engine could leave the words and the total disagreeing, which is
the one thing the page exists to prevent.

## Decision

Every line item carries a `derivation`: a formula id (`given`, `product`, `quotient`,
`difference`, `deducted`) and the terms it was computed from, each with a label, a value, a
unit and the id of its source. `lib/core/derive.ts` is the only place a formula is evaluated.
Item builders call `derive(formula, terms)` and use the amount it returns, so the derivation
and the amount come from one computation and share its rounding. A deal switched on rewrites
the derivation as `deducted`. The money-moving total carries its own trace (transfers, markup,
fixed fee) from the schedule that produced it.

Every `Source` names an id from the registry in `data/sources.ts`. The methodology table and
the breakdown page read the registry, so a source that exists in code also exists in copy.

## Consequences

- A unit test and a property test assert, for every item of every estimate, that evaluating
  its derivation reproduces its amount and that its source id is registered. The golden
  scenarios cover every builder.
- Adding a line item means supplying a derivation; the type makes it impossible to forget.
- The breakdown page is templates filled from derivations. It contains no AI-written text and
  cannot print a number the engine did not compute.
