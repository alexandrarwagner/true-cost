# ADR 003: Rarely-changing data is snapshotted, not fetched live

**Context.** HUD rents change yearly, Scorecard costs yearly, FX history daily but only by
one row. The live site must not depend on three third-party uptimes, and HUD publishes no
rate limits.

**Decision.** Scripts pull HUD FMR, Scorecard cost fields and FX history into versioned JSON
in `data/snapshots/`, each with `fetchedAt` and `sourceVersion`, shown in the UI and checked
by `/api/health`. Only school search (typeahead) and today's FX rate are fetched at runtime,
through our own cached API routes. A scheduled job opens a pull request with the diff; nothing
overwrites data silently.

**Alternatives.** Live calls for everything (slow, fragile); a database (see ADR 004).

**Consequences.** Snapshots can go stale; the health check and a CI age check make that
visible rather than silent.
