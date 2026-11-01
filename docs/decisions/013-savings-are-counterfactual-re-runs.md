# 013. Savings are counterfactual re-runs, not additive; no third-party deals

Date: 2026-10-31. Status: accepted.

## Context

"Ways to lower this number" could have been a list of typical savings. Typical figures would
not match the user's own inputs, and adding them up would overstate the result because levers
overlap: living on campus and sharing a flat cannot both apply.

## Decision

Each lever changes one input and re-runs the engine; the saving is the baseline total minus
the scenario total, in both currencies at the baseline rate. With several levers on, the page
shows one combined scenario, never a sum. Levers that conflict exclude each other. A lever
shows only when it applies and saves more than a threshold, and copy says "could save about",
never "will save". Exchange-rate risk is shown separately, not as a saving, and the copy never
suggests timing a payment. No provider is named or recommended.

## Consequences

- Up to ten engine runs per estimate with the flag on; acceptable at current sizes, to be
  watched in the estimate route's timing log.
- "Fewer transfers" can combine slightly better than its parts, because fees are charged per
  transfer and date-sharing payments change with batching; the property test allows for this.
- Student deals fit the same shape (ADR 014) rather than becoming a separate feature.
