# ADR 002: Exchange rates come from Frankfurter v2; FRED is not used

**Context.** The brief expected gaps for VND, NPR, NGN and BDT and suggested FRED as a
complement. Checked on 29 Oct 2026: Frankfurter's v2 blended feed covers all ten launch
currencies with daily history back to 1998 or earlier. FRED's API terms prohibit storing,
caching or archiving its content and restrict commercial use without written consent, which
rules out the snapshot architecture, and it lacks four of the ten currencies.

**Decision.** Frankfurter v2 for today's rate (runtime, cached) and for history (snapshotted
per currency by a script). No FRED. Every rate is stored with its date and "Frankfurter
blended" as the source.

**Alternatives.** Frankfurter v1 (ECB only, five currencies); FRED (terms); a paid provider
(cost, and no better coverage).

**Consequences.** Blended rates differ slightly from any single central bank's reference
rate. If Frankfurter's hosted API changes terms, the project is MIT-licensed and
self-hostable. Pre-launch task: read the licence page and confirm the commercial-use wording.
