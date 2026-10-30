# ADR 011: HUD rent areas are matched by city name, with a labelled state-wide fallback

**Context.** HUD publishes Fair Market Rents by metro area and county, and Small Area FMRs by
ZIP for some metros. The API documents no ZIP endpoint, its response field names could not be
verified without an account token, and a ZIP-to-county crosswalk is a second dataset.

**Decision.** For v1, the snapshot holds every state's metro and county records. The school's
city (from College Scorecard) is matched against metro names first, then any area name. When
nothing matches, the state-wide median per bedroom count is used and the line is labelled
"state-wide typical rent (city not matched)" with confidence "estimate". The school's own
off-campus figure is shown beside HUD rent when both exist.

**Alternatives.** Read HUD's published Small Area FMR spreadsheet into the snapshot and match
by ZIP (planned once the token verifies the API shape); require the user to pick their area
(more friction for a three-input product).

**Consequences.** College towns that share a metro with a larger city inherit that metro's
rent, which may be high. The user's own rent, when entered, always wins.
