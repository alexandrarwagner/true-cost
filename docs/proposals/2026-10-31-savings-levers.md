# Proposal: "Ways to lower this number" (step 1, for approval)

Status: draft for the owner's OK, 2026-10-31. No code has been written.

The numbers below come from re-running the existing engine (`computeEstimate`) on the five
golden scenarios with one input changed, which is exactly what the levers will do.

## 1. Lever interface

```ts
// lib/core/levers/types.ts (pure, no I/O)
export type LeverId =
  | "housing-oncampus"
  | "roommates-1"
  | "roommates-2"
  | "lease-12-vs-9"
  | "insurance-waiver"
  | "transfers-fewer"
  | "transfer-markup"
  | "flights-fewer";

export interface LeverContext {
  school?: SchoolCosts;
  rent?: AreaRent;
  schoolFlags?: SchoolFlags;
}

export interface Lever {
  id: LeverId;
  /** The confidence of the saving, from the data the scenario leans on. */
  confidence: Confidence;
  /** Levers that cannot be on together (on campus vs roommates or lease). */
  excludes: LeverId[];
  applies(input: EstimateInput, baseline: Estimate, ctx: LeverContext): boolean;
  /** Sets an absolute target derived from `baseline`, so apply twice equals apply once. */
  apply(input: EstimateInput, baseline: EstimateInput): EstimateInput;
  /** A tip with no figure (insurance waiver when the school's policy is unknown). */
  tipOnly?: boolean;
}

export interface RankedLever {
  id: LeverId;
  savingUsd: Cents; // baseline.total − scenario.total; 0 for tipOnly
  savingHome?: Minor; // at the baseline's rate, same rate for every lever
  confidence: Confidence;
  noteId: string; // copy key for the one-line "how"
}

export function rankLevers(input, baseline, ctx, opts: { thresholdUsd: Cents }): RankedLever[];
export function applyLevers(input, baseline, ids: LeverId[]): EstimateInput; // one combined scenario
```

Two changes from the brief's sketch, both to satisfy its own invariants:

- `apply` takes the baseline input as well. "Roommates + 1" and "trips − 1" are not
  idempotent on their own (the scratch run shows apply-twice ≠ apply-once for both). With an
  absolute target read from the baseline (`roommates = 2`, `trips = baselineTrips − 1`),
  applying a lever twice is the same as once, and the combined scenario is just every selected
  lever applied in sequence.
- `excludes`. At NYU, "live on campus" saves $1,622 while "share with two roommates" saves
  $13,020. Applying both means on campus wins and the combined figure collapses to $6,228
  against a sum of $25,524. The UI greys out a lever's toggle while an excluded one is on, and
  the combined scenario is always computed, never added.

Two counterfactual levers need engine inputs that don't exist yet:

- `transfers-fewer` needs `options.transferCadence: "monthly" | "semester"` in `schedule.ts`:
  monthly-billed items (rent, groceries, summer rent) batch into the semester-start transfer.
  The markup is unchanged because the amount is unchanged; only the fixed fees fall away.
- `insurance-waiver` needs a per-school flag. Proposed `data/school-flags.json`
  (`{ "193900": { "waiverAllowed": true, "sourceUrl": "...", "checkedOn": "..." } }`), empty
  at launch, and an `insurance.ownPremiumPerYearUsd` input so the scenario can replace the
  school premium with the user's own. Until a school has a flag, the lever is `tipOnly`.

## 2. What applies to each golden scenario (threshold $250 over the degree; reference markup 0.5%)

Savings are at the baseline's rate (₹95.27, ₩1,360.5 per USD). Confidence is the
scenario's weakest input.

| Scenario                                             | Lever              | Saving                             | Confidence | Note                                                                |
| ---------------------------------------------------- | ------------------ | ---------------------------------- | ---------- | ------------------------------------------------------------------- |
| 1. Indian master's, Purdue, on campus                | flights-fewer      | $4,090 (₹3.9 lakh)                 | estimate   | one trip a year → none                                              |
|                                                      | transfer-markup    | $1,040 (₹0.99 lakh)                | estimate   | assumed 1.5% → 0.5% reference                                       |
|                                                      | insurance-waiver   | tip, no figure                     |            | no flag for Purdue                                                  |
|                                                      | reduce uncertainty | band ₹1.01–1.10 crore → one figure |            | shown separately, not a saving                                      |
| 2. Indian master's, NYU, 2-bed, 1 roommate, 12-month | roommates-2        | $13,020 (₹12.4 lakh)               | government | HUD rent split three ways                                           |
|                                                      | lease-12-vs-9      | $6,270 (₹5.97 lakh)                | estimate   | no summer and no overlap rent                                       |
|                                                      | flights-fewer      | $4,032 (₹3.84 lakh)                | estimate   |                                                                     |
|                                                      | housing-oncampus   | $1,622 (₹1.55 lakh)                | school     | excludes roommates and lease                                        |
|                                                      | transfer-markup    | $581 (₹0.55 lakh)                  | user       | 0.8% → 0.5%                                                         |
|                                                      | transfers-fewer    | $80, hidden (below threshold)      |            | 22 monthly transfers at $5                                          |
|                                                      | combined, all on   | $21,756 (₹20.7 lakh)               |            | sum of the four would be $23,903: roommates shrink the lease saving |
| 3. Korean undergrad, Purdue, 4 years, 2 trips        | flights-fewer      | $7,308 (₩9.9m)                     | estimate   | two trips a year → one                                              |
|                                                      | transfer-markup    | $1,779 (₩2.4m)                     | estimate   |                                                                     |
|                                                      | reduce uncertainty | band ₩238m–267m → one figure       |            |                                                                     |
| 4. One year, no school data, paying from USD         | flights-fewer      | $2,000 (no home figure)            | estimate   | the only lever: no transfers, no housing data                       |
| 5. Family of three, own rent $1,400, school plan     | housing-oncampus   | $12,968 (₹12.4 lakh)               | school     | **see question 3**                                                  |
|                                                      | flights-fewer      | $4,060 (₹3.87 lakh)                | estimate   |                                                                     |
|                                                      | transfer-markup    | $1,282 (₹1.22 lakh)                | estimate   |                                                                     |
|                                                      | transfers-fewer    | $210, hidden                       |            | 18 monthly transfers at $15                                         |
|                                                      | roommates          | does not apply                     |            | the rent is the user's own figure, not a HUD unit price             |

Every applying lever is idempotent under the absolute-target rule, and every combined
figure above is below the sum of its parts, which the property tests will assert.

## 3. Constants and data I need from you

| Item                      | Proposed                                 | Why you, not me                                                                                                    |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Reference transfer markup | 50 bps, placeholder                      | needs a source and `checkedOn` in `data/constants.ts`                                                              |
| Saving threshold          | $250 over the degree (`SAVINGS_MIN_USD`) | the brief's example; confirm                                                                                       |
| `data/school-flags.json`  | empty at launch                          | the waiver lever shows a figure only for schools you add                                                           |
| Deals seed (NYU)          | the three rows from the brief            | museum row has no price, so no figure; the two national rows need Amazon's and Spotify's own pages before approval |

## 4. Copy (all under `copy.savings`, "could save", "about", never "will")

| Key                                    | Text                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| heading                                | Ways to lower this number                                                                                                                                                               |
| intro                                  | Each one is worked out from your own inputs. Turn one on to see your total change. They overlap, so with several on we work out one new total rather than adding them up.               |
| saving(home, usd)                      | could save about {home} ({usd}) over your degree                                                                                                                                        |
| housing-oncampus                       | Live on campus · Room and meals on campus, using the school's published figure.                                                                                                         |
| roommates-1 / roommates-2              | Share with one roommate / Share with two roommates · Rent for a {n}-bedroom place in this area, split {n+1} ways.                                                                       |
| lease-12-vs-9                          | Skip rent over the summer · If you can find a 9- or 10-month lease, or someone to sublet to. Not every landlord offers one.                                                             |
| insurance-waiver (tip)                 | Check whether your school lets you waive its health plan · Some schools accept your own cover if it meets their rules. We don't know this school's policy yet.                          |
| insurance-waiver (figure)              | Use your own health cover · This school allows waivers. Based on the premium you entered.                                                                                               |
| transfers-fewer                        | Send money once a semester · Fewer transfers means fewer fixed fees. You'd hold more money at once, which is a trade-off.                                                               |
| transfer-markup                        | Compare your transfer markup · You're paying {x}% over the mid-market rate. Some services charge about {ref}%. We don't recommend any provider.                                         |
| flights-fewer                          | One fewer trip home a year · If you're able to. Fares here are estimates.                                                                                                               |
| uncertainty.heading                    | Reduce the uncertainty                                                                                                                                                                  |
| uncertainty.body                       | Paying from a US dollar account doesn't lower the total, but it removes the exchange-rate range: {band} becomes one figure. Some transfer services offer fixed-rate scheduled payments. |
| deals.heading / none / checked / ended | Student deals near {city} · We haven't checked deals for your school yet. · Checked on {date} · This deal ended                                                                         |
| showMore / tryIt                       | Show more · Try it                                                                                                                                                                      |

## 5. Questions before I build

1. **Threshold for deals.** Prime Student's stated saving is $140 over a two-year degree,
   below the $250 threshold. I'd apply the threshold to counterfactual levers only and
   always show approved deals, figures first and figure-less ones last. OK?
2. **Known rent and roommates.** When the user typed their own rent, splitting it assumes it
   is the whole unit's rent. I'd not offer the roommate lever in that case (scenario 5).
3. **Families on campus.** Scenario 5 shows a $12,968 "live on campus" saving for a family of
   three, from an undergraduate room-and-board figure. I'd skip the on-campus lever when
   `dependants > 0`.
4. **Deal lines.** Our model has no subscriptions or transit line; deals in software,
   subscriptions, culture and fitness would map to `otherExpenses`, food to `food`, and
   transport to none (so no figure). A deal's saving is capped at that line's total.
5. **Destination neutrality.** The destination refactor hasn't started here: engine fields are
   named `amountUsd`. The levers will touch `EstimateOptions` only and carry no dollar values
   except the threshold constant, but true neutrality waits for that refactor.
6. **`SAVINGS_ENABLED`** on in demo and preview, off in production, like the other flags.

## 6. Build order once approved

2 core modules and tests (incl. `transferCadence` in the schedule) · 3 UI section, toggles,
`lv=` URL param · 4 deals data model, NYU seed, CI checks · 5 research and review scripts,
weekly freshness job · 6 docs and two ADRs, then the manual list.
