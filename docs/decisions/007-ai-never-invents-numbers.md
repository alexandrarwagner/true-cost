# ADR 007: AI reads, extracts and explains; it never produces a number

**Context.** Pasted letters are untrusted text. A model that invents a cost figure, a rate
or a recommendation would undermine every other principle.

**Decision.** Three uses only, server-side, strict JSON validated with zod: extract fields
from pasted text (each with a verbatim quote, checked in code; shown for confirmation before
use), explain a computed result in plain English using only numbers passed in (checked in
code, template fallback), and fuzzy school matching as a fallback that must still resolve to a
real Scorecard UNITID. The whole product works with `AI_ENABLED=false`.

**Alternatives.** Let the model estimate missing costs (unsourced, unverifiable).

**Consequences.** Some letters will be extracted incompletely. The user fills the gaps.
