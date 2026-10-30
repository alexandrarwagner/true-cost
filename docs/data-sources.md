# Data sources

Every figure in True Cost comes from one of these, a hand-curated constant with a source and
date, or the user. Verified on 29 October 2026 by calling each service; re-verify before launch.

| Data                                                        | Source                                                                            | Access                                                                                                                                    | Refresh                                                       | Licence / terms                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| School search, tuition, room & board, other expenses, books | College Scorecard API, `https://api.data.gov/ed/collegescorecard/v1/schools.json` | Free api.data.gov key; 1,000 requests per IP per hour                                                                                     | Search at runtime (cached); cost fields snapshotted           | US government data; footer "Powered by College Scorecard Data"                               |
| Rent                                                        | HUD Fair Market Rents, FY2027 (published 1 Sep 2026, effective 1 Oct 2026)        | API at `https://www.huduser.gov/hudapi/public` with a free HUD User bearer token; Small Area FMRs from HUD's published FY2027 spreadsheet | Snapshot, yearly (new FY each October)                        | US government data                                                                           |
| Exchange rates, today and history                           | Frankfurter v2 blended feed, `https://api.frankfurter.dev/v2/rates`               | No key; rate-limited against abuse, no quotas                                                                                             | Today's rate at runtime (cached minutes); history snapshotted | MIT code; blended rates stated free for commercial use. Read the licence page before launch. |
| One-off fees                                                | `data/constants.ts`                                                               | Hand-curated with `source`, `url`, `checkedOn`                                                                                            | CI fails if any constant is older than 180 days               | Various public sources                                                                       |

## Snapshots and refresh

| Snapshot                    | Script                       | Needs              | What it holds                                          |
| --------------------------- | ---------------------------- | ------------------ | ------------------------------------------------------ |
| `fx-{CUR}.json` (ten files) | `npm run snapshot:fx`        | nothing            | Daily USD rates from 2010 to today per launch currency |
| `scorecard-costs.json`      | `npm run snapshot:scorecard` | `DATA_GOV_API_KEY` | Cost fields for every school with out-of-state tuition |
| `hud-fmr.json`              | `npm run snapshot:hud`       | `HUD_API_TOKEN`    | FMR by metro and county for every state, FY2027        |

Each file carries `name`, `fetchedAt` and `sourceVersion`; `/api/health` flags any older
than 180 days. `.github/workflows/refresh-snapshots.yml` runs weekly and opens a pull request
with the diff; nothing overwrites data on `main` without review. At runtime, school search and
today's rate are live; cost fields and rent read the snapshot first and fall back to a live
call when a key is configured.

## College Scorecard: what was verified

All field names used by the app returned values for Purdue (UNITID 243780):
`latest.cost.tuition.out_of_state`, `latest.cost.tuition.in_state`, `latest.cost.roomboard.oncampus`,
`latest.cost.roomboard.offcampus`, `latest.cost.otherexpense.oncampus`, `latest.cost.otherexpense.offcampus`,
`latest.cost.booksupply`, `latest.cost.attendance.academic_year`, `school.degrees_awarded.predominant`.

- `latest` resolves to the `2024` year prefix for cost fields. Which academic year that is
  must be confirmed in the Data Dictionary release notes.
- `roomboard.offcampus` and `otherexpense.offcampus` are institution-reported and often equal
  the on-campus figures. They are shown beside HUD rent, not used instead of it.
- Partial `school.name` matching works for typeahead. `per_page` max 100, `page` zero-indexed.
- Figures are mostly undergraduate. Graduate tuition is usually different; the tuition field
  stays editable and says so.

## HUD Fair Market Rents: what was verified

- Endpoints: `fmr/listStates`, `fmr/listCounties/{state}`, `fmr/listMetroAreas`,
  `fmr/statedata/{state}`, `fmr/data/{entityid}?year=`. `entityid` is a county FIPS or CBSA
  code taken from the list endpoints. No ZIP endpoint is documented.
- Auth is `Authorization: Bearer <token>`; an unauthenticated call returns 401.
- Rate limits are not published. Response field names could not be checked without a token:
  `lib/adapters/hud.ts` reads both documented naming variants (`metro_name`/`county_name`,
  `code`/`fips_code`, `Efficiency` to `Four-Bedroom`) and parses anything else to "no data".
  First task once a token exists: run `npm run snapshot:hud -- --only IN` and check the count.
- Areas are matched to the school by city name against metro and county names. When nothing
  matches, a state-wide typical (median) rent is used and labelled as an estimate. ZIP-level
  Small Area FMRs are not read yet; HUD publishes them as a spreadsheet.
- FMR is the 40th-percentile gross rent for a standard-quality unit. FY2027 uses 2020 to 2024
  ACS data. Small Area FMRs (ZIP level) exist for some metros and are published as a
  spreadsheet, which the snapshot script reads.

## Exchange rates: what was verified

Frankfurter v1 is ECB-only (30 currencies) and lacks VND, NPR, TWD, NGN and BDT. Frankfurter v2
blends over 100 central banks and covers all ten launch currencies with daily history:

| Currency      | History from |
| ------------- | ------------ |
| INR           | 1973         |
| CNY, KRW, TWD | 1981         |
| CAD           | 1953         |
| BRL           | 1994         |
| VND, BDT      | 1998         |
| NPR, NGN      | 1999         |

Caveats: blended rates are Frankfurter's own calculation and differ slightly from ECB
reference rates. For NGN, official rates have at times diverged a lot from what families can
actually get; the UI carries a note.

FRED (St. Louis Fed) was considered and rejected: its API terms prohibit storing, caching or
archiving content, restrict commercial use without written consent, and it lacks four of the
ten currencies. See ADR 002.
