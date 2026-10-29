# ADR 004: No database, no accounts

**Context.** Inputs are a country, a school, a tuition figure and a few options. Nothing
needs to persist server-side.

**Decision.** No database and no user accounts in v1. Inputs live in page state and, for
sharing, in the URL as the inputs only, never personal data. Upstash holds only rate-limit
counters.

**Alternatives.** Saved estimates behind a login (adds privacy and security surface for no v1
benefit).

**Consequences.** No cross-device history. Shared links are the persistence model.
