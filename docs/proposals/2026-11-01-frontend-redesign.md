# Proposal: rebuild the frontend in the "tuition+" design, plus the full-calculation page

Step 1 of the frontend brief. Nothing here is built yet; it is the plan for your OK.

## What I looked at

- The mockup now in the repo at `design/E-homepage-preview.html` is `E-homepage-preview_20.html`
  from your Downloads folder (1 Nov, 14:19), the newest of the twenty versions there. It differs
  from the `tuition-plus-homepage.html` you shared earlier (that one matched version 17). Tell me
  if version 20 is not the one you mean. It is not staged for commit (see question 7).
- Viewed at 1440 px and at 375 px, through "or see an example first", with every section
  scrolled into view. At 375 px the page is 1,440 px wide: there is no viewport meta tag and no
  width media query, which is problem 1 in the brief.
- Tokens were read from the page's computed styles, not from the source, so they are what the
  browser renders.

## 1. Component map

| Mockup section                                              | Our component today                                               | Change                                                                                                                                                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header: wordmark, "How we work it out", "Get my estimate"   | `app/layout.tsx` (skip link, footer only)                         | New `SiteHeader`: wordmark, anchor link to `#how`, button that focuses the input bar. Sticky result nav replaces it once a result exists.                                                                             |
| Hero: headline with icon tiles, subhead                     | `copy.form.heading`, `copy.form.intro`                            | New `Hero`. Icon tiles are inline SVG with `aria-hidden`; the headline stays one sentence for screen readers.                                                                                                         |
| Input bar: from, school, tuition, years stepper, "Show me"  | `InputForm` + `OriginFields` + `SchoolSearch` + `ProgrammeFields` | `InputBar` wraps the same four field components in one rounded bar on wide screens and a stacked form under 720 px. Years becomes a `−/+` stepper (see engine change 4). Start term moves to "Make it more accurate". |
| "or see an example first"                                   | none                                                              | `ExampleLink`: loads a fixed sample request (question 11) and sets example mode.                                                                                                                                      |
| Empty state with dashed tree skeleton                       | none (form only until a result)                                   | `EmptyTree`: the skeleton, static SVG, with the "Your estimate will appear here" copy.                                                                                                                                |
| Result: tuition tree, category nodes filling in, total node | `Unfold` (table rows animating in), `Headline`                    | `Tree`: tuition node, four category nodes, total node. Same unfold timing, rebuilt as a grid that becomes a vertical list under 720 px. Count-up on the total (fix 8).                                                |
| Sticky result nav + "₹X · N years · Edit"                   | none                                                              | `ResultNav`: in-page anchors; "Breakdown" goes to the full-calculation page; "Edit" scrolls to the bar.                                                                                                               |
| "Know a cost we missed?"                                    | none                                                              | `CustomCosts` (engine change 2): label, amount, currency, one-time/monthly, max 10, privacy line.                                                                                                                     |
| "Where the money goes" + "See as chart"                     | `Explanation` category totals                                     | `Shares`: an accessible list of category shares with bars by default; "See as chart" toggles the area-proportional circles (inline SVG, no new dependency). Question 8.                                               |
| "If the rupee moves": band chart, keep-aside, note          | `RangeSection`, `RangeChart` (recharts), `WhatIf`                 | Restyle. Copy changes: Frankfurter instead of FRED (fix 2); keep the existing "not a prediction" line. The what-if slider stays.                                                                                      |
| Saving tips, student deals with category filters            | `Savings`, `SavingsRow`, `DealRow`, `LeverSwitch`                 | The lever rows replace the editorial tips (fix 6). Deals move into a card grid with category filter chips, "Checked {month year} · No paid listings". Same data, same rules.                                          |
| "How we work it out" table                                  | `Sources` (per-item list)                                         | `Methodology`: generated from the source registry (engine change 6). `Sources` stays on the breakdown page.                                                                                                           |
| Share: "Download PDF", "Print it", the one-page preview     | `ShareBar` (copy link, print)                                     | Restyle. "Download PDF" is the browser's print-to-PDF via a print stylesheet (brief 3.6). The preview image is the breakdown page's print view.                                                                       |
| Footer                                                      | `app/layout.tsx` footer                                           | Wordmark plus "Free. Not a prediction. Every number shows its source." Privacy link stays.                                                                                                                            |
| Timeline, compare view, letter paste, AI explanation        | `Timeline`, `CompareView`, `LetterPaste`, `Explanation`           | Not in the mockup. Timeline moves to the breakdown page. Compare stays behind its flag and gets the new tokens. Letter paste and explanation stay where they are, restyled.                                           |

## 2. Tokens, with contrast

Measured from computed styles. Ink is `#14151F`; "muted" is `#4A4B63`; "dark" is `#2A2340`.

| Token           | Value                    | Use                                     | Contrast                                                                         |
| --------------- | ------------------------ | --------------------------------------- | -------------------------------------------------------------------------------- |
| `ink`           | `#14151F`                | text                                    | 16.4 on page bg, 18.2 on white                                                   |
| `muted`         | `#4A4B63`                | secondary text                          | 7.6 on page bg, 8.5 on white                                                     |
| `page`          | `#F2F3F5`                | page background                         |                                                                                  |
| `card`          | `#FFFFFF`                | cards, input bar                        |                                                                                  |
| `line`          | `#E4E5EA`                | borders only (1.3 on white: never text) |                                                                                  |
| `dark`          | `#2A2340`                | total node, "where it goes", share      | white on dark 14.9; `#C4C6CE` on dark 8.7                                        |
| `brand`         | `#3E43C8`                | wordmark plus sign, links               | 7.4 on white, 6.7 on page bg                                                     |
| `brand-soft`    | `#6B70E6`                | hover, large text only                  | 4.1 on white: fails AA for body text, passes for large. Not used for small text. |
| `cat-tuition`   | `#8F93F2` chip `#C9CBFA` | tuition                                 | ink on `#C9CBFA` 11.6; ink on `#8F93F2` 6.6                                      |
| `cat-housing`   | `#C9CBFA`                | housing                                 | ink 11.6; muted 5.4                                                              |
| `cat-living`    | `#DDFF7A` (lime)         | living, the total figure, the CTA       | ink 16.1; muted 7.5; lime on dark 13.2                                           |
| `cat-oneoff`    | `#F7B9EE` (pink)         | one-off                                 | ink 11.4; pink on dark 9.3                                                       |
| `cat-moving`    | `#9FEADA` (mint)         | moving money                            | ink 13.2; muted 6.2; mint on dark 10.8                                           |
| `cat-insurance` | to choose (question 1)   | health insurance, if split              | needs ink ≥ 4.5 and to differ from the five above for colour-blind users         |
| `tint-pink`     | `#FCE4F8`                | keep-aside box                          | ink 15.2                                                                         |
| `tint-brand`    | `#EEEFFD`                | selected states                         | ink 15.9                                                                         |
| `error`         | `#B3261E`                | form errors                             | 6.5 on white                                                                     |

Rules the tokens carry: white text never sits on lime, mint, pink or the tuition purple
(1.1 to 2.8, all fail); `#5FCDB8` and `#C4C6CE` are decoration only on light backgrounds. Every
category chip pairs its colour with its name, and the tree nodes and share bars carry a text
label, so colour is never the only signal.

Type: Archivo, with Noto Sans Bengali for the taka sign. Scale: 15 px body, 14 and 13 px small,
17 and 19 px semibold labels, 22 to 34 px headings, 60 to 72 px display with tight tracking.
Radii: 14 px inputs, 23 to 24 px cards and chips, pill buttons. Both fonts load through
`next/font/google`, which downloads them at build time and serves them from our origin, so the
existing `font-src 'self'` policy holds and no request goes to Google at runtime. No new
package. Tokens live in `app/globals.css` under Tailwind 4's `@theme`, which is where this
project keeps its theme (there is no tailwind.config).

## 3. Engine and backend changes

### 3.1 Derivation trace (every line item explains itself)

```ts
// lib/core/types.ts
export type FormulaId =
  | "given" // one money term, as stated by a source or the user
  | "product" // money × count × count…  (fare × 2 × trips; fee × applicants)
  | "quotient" // money ÷ people            (HUD rent ÷ (roommates + 1))
  | "difference" // money − money, floored at zero (tuition − scholarship)
  | "deducted"; // money − deal saving per occurrence, floored at zero

export interface Term {
  /** Copy key, e.g. "hud_rent_1bed", "roommates_plus_one", "one_way_fare". */
  label: string;
  value: Cents | number;
  unit: "usd" | "count" | "people" | "months" | "nights";
  sourceId?: SourceId;
}

export interface Derivation {
  formula: FormulaId;
  terms: Term[];
  /** Per occurrence; equals LineItem.amountUsd by construction. */
  result: Cents;
}

export interface LineItem {
  // …existing fields…
  derivation: Derivation;
}
```

`lib/core/derive.ts` exports `evaluate(formula, terms): Cents`, using the same money helpers
the builders use today (`mulCents`, `clampNonNegative`), and `derive(formula, terms)` which
returns `{ derivation, amountUsd }`. Each builder in `lib/core/items/*` calls `derive` and
uses its `amountUsd`, so the amount is never computed twice. `applyDeductions` rewrites the
derivation as `deducted` when a deal is on. The degree total on the breakdown page is
`result × occurrencesOverDegree(item)`, from the calendar code that already exists.

Tests: for every line item in every golden scenario, `evaluate(d.formula, d.terms) ===
item.amountUsd`, and `degreeTotal(item)` equals the figure the breakdown page prints. A
property test does the same over the lever arbitrary. Moving money gets its own trace on the
estimate: `{ transfers, markupBps, fixedFeeUsd, markupUsd, feesUsd }`, computed in
`buildSchedule` where the fees are already summed.

### 3.2 User-added costs

```ts
// lib/core/types.ts
export interface CustomCost {
  label: string; // 1–40 chars, plain text
  amountUsd: Cents; // converted at today's rate by the service when entered in home currency
  frequency: "one_off" | "monthly";
}
EstimateOptions.customCosts?: CustomCost[]; // max 10
```

Each becomes a line item `custom-<n>` with `source.kind = "user"`, category `one_off` (arrival)
or `living` (monthly), so it flows through totals, the timeline, the replay, the levers and
print with no special cases. The request schema takes `{ label, amount, currency: "USD" |
"home", frequency }`; the label is trimmed, control characters rejected, rendered as text. Home
amounts convert once in `services/estimate.ts` at the baseline rate, and the item's derivation
records the rate and date. Share links gain a `cc` param (JSON, like `o`); the server rejects a
query string over 2,000 characters and the UI stops adding items before that. The privacy line
"Don't add personal details: this goes in your share link." sits under the input.

### 3.3 Health insurance as its own category (needs your confirmation)

`Category` gains `"health_insurance"`; `Totals` gains `healthInsurance`; the two insurance
items move; `copy.categories`, the unfold tree, the compare table, the shares view and the
methodology table get a sixth row; the golden snapshots regroup with `total` and
`hiddenPercentOfTuition` unchanged, which the test asserts explicitly. Done first in step 2 so
everything after builds on six categories.

### 3.4 Programme input

Years becomes the primary input, a stepper from 1 to 4 (the engine's `DegreeYears`). The
engine's programme type stays, derived as today: 4 years → undergraduate, 2 → master's, else
other. One correction to the brief: in our engine the programme type does not change summer
behaviour; summer rent depends only on the 12-month-lease option. It only affects the tuition
hint and the pre-filled years from the school's predominant degree. Question 2 covers whether
to keep an optional type choice.

### 3.5 Share links and server rendering

`encodeShare`/`decodeShare` gain `cc`; `lv` already exists. The home page already renders a
shared result on the server; the breakdown page does the same from the same params.

### 3.6 Source registry and the methodology table

```ts
// data/sources.ts
export type SourceId = "user" | "scorecard" | "hud" | "frankfurter" | "constants" | "deal";
export const SOURCES: Record<SourceId, { name; url?; licence; provides: string[]; confidence }>;
```

`Source` gains `id: SourceId`. The methodology table, the breakdown page's source lines and
`docs/data-sources.md`'s first table all read this registry; a unit test asserts every line
item in the golden scenarios carries a registered id, so copy and code cannot drift.

### 3.7 Already covered

City-level deals (3.7 in the brief) already work: `dealsFor` returns school, city and national
deals. The PDF is the print stylesheet, no server work.

## 4. "Your full calculation" page

Route `app/estimate/breakdown/page.tsx`, a server component reading the share params,
rendering `runEstimate` once; no client JavaScript needed. Linked from a "See the full
calculation" button under the total, from every figure in the tree and shares view (anchors
`#tuition`, `#housing`, …), and from the "Breakdown" tab.

1. **Summary**: inputs, optional details, the rate with date and source, totals in both
   currencies, example-mode badge when relevant.
2. **Per category**: heading with subtotal, then one block per line item: name and when it is
   paid (phase and billing mapped to copy), the formula sentence from a template keyed by item
   id filled from `derivation.terms` ("$2,700 a month ÷ 2 people × 20 months = $27,000"), USD
   and home amounts, confidence badge, source name, link and checked-on date, and for estimates
   the band and the one-line reason for the middle value (from `data/constants.ts` notes).
3. **Exchange-rate method**: the rate and date; "every 2-year period since {historyFrom}
   ({windows} of them), applied to your payment dates, starting from today's rate"; best tenth,
   median, worst tenth; the not-a-prediction line.
4. **Moving money**: markup, fixed fee, number of transfers, totals, from the new trace.
5. **What we don't include**: a list in `content/copy.ts` for your review (application fees,
   tests, spending beyond the school's estimate, travel insurance, laptop, …).
6. **"Spotted a mistake?"**: a GitHub new-issue link with the item id in the title, nothing
   else.

Markup: one `<table>` per category with `<th scope="col">` headers and `<th scope="row">` item
names; under 720 px each row lays out as a stacked card with CSS grid and the headers repeated
as labels, the table semantics unchanged. Print stylesheet: no nav, no toggles, page breaks
between categories.

Tests: Playwright opens the breakdown from a share link with JavaScript disabled; reads each
category subtotal on the result page and on the breakdown and asserts equality; axe; a print
snapshot (`page.emulateMedia({ media: "print" })` screenshot compared with a stored one).

## 5. How each mockup problem is handled

1. Mobile-first: the bar stacks under 720 px, the tree becomes a list, and an e2e test asserts
   no horizontal overflow at 320 px.
2. Sources: Frankfurter and College Scorecard named; the table is generated (3.6).
3. Confidence labels: the four existing ones everywhere; HUD rent carries `government`.
4. Housing copy: "ten months a year, plus the summer only on a 12-month lease".
5. Placeholder: "e.g. Laptop, winter coat".
6. Tips replaced by the lever rows.
7. Deals: the mockup's Boston samples go through the deals rules by hand now (official pages
   only, both prices or no figure); the research script in savings step 5 later. Expect
   Orangetheory, the Gardner Museum, the Red Sox programme and Cafe Landwer to fail on their
   Boston.com sourcing unless an official page states the same. Question 10.
8. Count-up: the server renders the final figure; a client enhancement animates it only when
   `prefers-reduced-motion` is not set, inside an `aria-hidden` span beside an `sr-only` final
   value, and any error leaves the final figure in place.
9. Example mode: a persistent "Sample figures" badge in the sticky nav and on the breakdown
   page, and every share link from example mode carries `ex=1`.

## 6. Build order and what I would refactor

As in the brief. Step 2 (engine) touches `lib/core/types.ts`, `derive.ts`, the five item
builders, `schedule.ts`, `deductions.ts`, `data/sources.ts`, the schemas and the golden tests.
Steps 3 to 5 replace `EstimateFlow`'s three-step state with one page that has three states
(empty, example, result) and a result layout built from the new components. Step 6 adds the
breakdown route. Step 7 the methodology table. Step 8 the audits.

Refactors I'd fold in: `content/copy.ts` is 400 lines and will roughly double, so split it into
`content/copy/*.ts` with `content/copy.ts` re-exporting one `copy` object (same import path
everywhere); `EstimateFlow` loses the step machine; `Explanation` splits into the shares view
and the AI explanation.

## 7. Questions before I start

1. **Insurance split** (3.3): confirm. If yes, which colour for the sixth category? The
   mockup's palette has no sixth; I'd propose a pale sky `#BFE3FF` (ink 14.6) unless you have one.
2. **Programme type**: keep an optional undergraduate/master's choice under "Make it more
   accurate"? My recommendation: drop it, derive the type from years as the engine does now, and
   keep the school's predominant degree only to pre-fill the stepper.
3. **Years range**: the stepper runs 1 to 4, matching the engine. Should it go to 5 or 6 for
   PhDs? That widens `DegreeYears` and every fixture.
4. **Lighthouse ≥ 90**: measuring it needs the `lighthouse` package, a new dev dependency. Add
   it, or do you want to run the audit yourself from Chrome's DevTools?
5. **Fonts**: Archivo and Noto Sans Bengali self-hosted via `next/font/google` as above. OK?
6. **Name**: the mockup's wordmark is "tuition+" and the app is "True Cost" everywhere (site
   name, README, repo). Rename the product, or keep "True Cost" with the new wordmark style?
7. **The mockup file**: commit `design/E-homepage-preview.html` (1 MB, nine embedded images), or
   add `design/` to `.gitignore`?
8. **"Where the money goes"**: default to the accessible list with bars and toggle to the
   circles, as proposed? The mockup shows circles first.
9. **User-added costs**: home-currency amounts convert at the baseline rate when entered, and
   the amount cap is $100,000 per item. OK?
10. **Boston**: re-checking the sample deals produces `data/deals/city/boston.json`. Do you want
    Boston as the second city now, or only NYU until the research script exists?
11. **Example mode**: the mockup's sample is $37,500 for 2 years in Boston. Our fixtures hold
    Purdue and NYU. Use NYU at 2 years, or add Boston University (UNITID 164988) to the fixtures
    so the example matches the mockup? Example mode must also work in production, where
    DEMO_MODE is off, so it would read the fixture adapters for that one school regardless of
    the flag.
12. **Copy split**: the `content/copy/*.ts` folder in 6, or keep one file and accept its size?

## 8. Design-system reconciliation (1 November, after steps 3 and 4)

The Tuition+ design system now lives at `.claude/skills/tuition-plus-design-system/SKILL.md`
and is the source of truth for tokens and checks. Mockup version 22 replaced version 20; its
only content change is "How we work it out" in the result nav.

Brought in line: the type scale (hero 84, H2 52–60, H3 30, lead 20, body 15), the `.display`
style (width 112%, weight 500, tracking −0.035em), the single focus ring (2 px brand, offset
3 px) applied globally, neutral shadows, the frosted nav, the strong divider and the
"worst tenth" chart colour as tokens, the form pill shape on wide screens.

Still open, because the design system and the briefs disagree or the system is silent:

1. **Name.** The design system calls the product Tuition+ and specifies the logo ("tuition" with
   a raised "+" in the tuition colour). The app is "True Cost" everywhere. The earlier default
   kept the name; the design system says otherwise. Decide, and the wordmark follows.
2. **Six categories, five cost colours.** Health insurance is its own category (approved, built)
   but the system defines colours for five costs only. Proposed: pale sky `#BFE3FF` (ink 14.6:1).
3. **Confidence marks.** The system has three marks (official square, estimate dashed circle,
   your-number dot); the brief keeps four labels. Proposed: four labels, with "school figure" and
   "government data" both drawn as the official square.
4. **"No gradients" versus "glowing bubbles".** The bubbles will use flat fills with a soft
   neutral shadow, not a gradient.
5. **School search as a combobox** (arrows, Enter, Esc), external links in a new tab with a cue,
   and chart labels stating key numbers: scheduled in step 5 and checked in step 8.
6. **Mobile views board.** The system refers to one; it has not reached me. Until it does, the
   stacked layouts follow the responsive rules in section 5 of this proposal.

7. **Display width (added after step 8).** The design system's display style uses Archivo at
   112% width. That needs the font's width axis, which doubled each font file and held the
   phone Lighthouse score at 89-91. Archivo now loads without the axis (33-35 KB per file,
   scores 95-97). If the stretch matters more than those points, it is one line in
   `app/fonts.ts` and one in `app/globals.css` to restore.
