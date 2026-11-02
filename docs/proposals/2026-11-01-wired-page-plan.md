# Plan: the designer's HTML is the front end

Step 1 of the brief in `design/wired/CLAUDE-CODE-PROMPT.md`. Nothing here is built yet; the
plan waits for the owner's OK. Line numbers refer to `design/wired/E-homepage-wired.html`.

## A. How the page is served at `/`

- **A route handler, not a static file.** `app/route.ts` (GET) reads
  `design/wired/E-homepage-wired.html` once at start-up and returns it as `text/html`. A
  static file under `public/` with a rewrite would not work: the site's Content-Security-Policy
  uses a per-request nonce with `strict-dynamic`, and a static file cannot carry a nonce.
- **Serve-time nonce only.** The handler adds `nonce="…"` to each `<script src>` tag as it
  streams the file. The file on disk is not changed; the markup the browser sees differs from
  the file only by those nonce attributes. The design-lock test compares the file, so this is
  not a drift.
- **`?engine=prototype`** (development and test only): the handler swaps `engine.js` for
  `design/wired/prototype/*.js` (the country list, FX history, fan calculation and the
  prototype adapter, unchanged). In production the parameter is ignored.
- **The React home page is retired** once the wired page passes every test in section D.
  Until then it moves to `/react` so the two can be compared side by side; the shared-link page
  `/r`, the full calculation `/estimate/breakdown`, `/privacy` and the API routes stay as they
  are.
- **Two things the page needs that the policy blocks today**, each needs a decision (section F):
  the Google Fonts stylesheet (line 36) and the font files it loads.

## B. The engine in the browser

- **Bundle.** `lib/browser/engine.ts` imports the pure engine (`lib/core`, `data/constants`,
  `data/countries`) and defines `window.TPEngine`. esbuild (one new dev dependency, see
  section F) bundles it to `public/engine.js` as a classic script in a `prebuild` step; the
  bundle is also built in CI before the tests. `lib/core` has no server-only or Node imports, so
  it bundles as it is.
- **Same numbers as the server.** `TPEngine.estimate(input)` maps the page's input to the
  engine's `EstimateInput`, calls `computeEstimate()`, and maps the result back to the page's
  shape (`c`, `tot`, `exM`, `exO`, `o`, `fx`, `meta`). The contract test runs the same inputs
  through `runEstimate()` in Node and through the bundle, and asserts equal totals.
- **Mapping the engine's six categories to the page's five.** Health insurance folds into
  `live` (the page's own words for living costs are "food, transport, phone, books and health
  insurance"). The full-calculation page keeps it as its own line.
- **Additive extensions**, as the brief asks: `lines` (every line item with name, amount,
  phase, source, `checkedOn`, confidence and derivation); `fx` for every supported currency, or
  `null` when there is no history; `meta.sampleNote` from the real data ("Rent and living costs
  for New York, NY" from HUD and the school's figures, or "Sample rent" in demo mode);
  `version` = `engine-1.0.0 · constants <date> · fx <snapshot date>`.
- **Data in the browser, no keys.**
  - Exchange-rate history: one static JSON per currency under `public/data/fx/<CUR>.json`,
    written from `data/snapshots/fx-*.json` at build time and thinned to month ends (about
    5 KB each instead of 220 KB). Fetched when the currency chip changes. Today's rate comes
    with it (the snapshot's last point); the existing `/api/fx/latest` route can refresh it.
  - School costs and rent: a new route `/api/context?unitId=…` returns the chosen school's
    Scorecard figures and the HUD rent for its area, using the server-side keys. The adapter
    fetches it when a school is chosen. A static table of every HUD area and every school would
    be about 1 MB and would have to be rebuilt on a schedule; the route reuses the adapters,
    caching and rate limits the app already has. In demo mode the route serves the fixtures.
  - Constants (fees, deposits, transfer markup) are inside the bundle.
- **Synchronous contract, asynchronous data.** The page calls `estimate()` synchronously. The
  adapter therefore loads context ahead of time (on school and currency change) and
  `estimate()` uses what is loaded. An added method, `TPEngine.ready()`, returns a promise the
  page's `run()` awaits before revealing, so "Show me" never shows a half-loaded result. If a
  source failed, its lines are labelled "Our estimate", exactly as the server does.
- **School search.** The `#school` field and `#school-list` dropdown call the existing
  `/api/schools/search?q=` route (College Scorecard, server key, rate limited); the chosen row
  carries the UNITID, city, state and ZIP into `estimate()`.

### What step 3 changed from this plan

- Rate history is served by `/api/fx/history?currency=` instead of static files under
  `public/data`: the demo/real split happens at run time (fixtures in DEMO_MODE), so a
  build-time file could not match what the server-side estimate uses. The route serves the
  same snapshot, cached for a day, about 35 KB compressed.
- `/api/context?unitId=&zip=&state=&city=` returns the school's costs and the area's rent
  through the existing adapters, as planned.
- The fan chart's dashed "worst tenth" line needed a per-payment series the engine did not
  have; `FxPathPoint.worstMean` (the mean of the worst tenth of windows at each payment) was
  added to the core, additively.
- The brief's invariant `fx.lo ≤ base ≤ fx.hi` is not a property of a replay: when every past
  window weakened the currency (the demo's synthetic history), even the best tenth sits above
  today's rate. The contract test checks `lo ≤ hi`, `hi > base` and `buf = hi − base`.
- Monthly "know a cost" items follow the engine's calendar (the months the student is there),
  not a flat twelve a year; the page's own arithmetic assumed twelve.
- Degree years now run 1 to 6 across the engine, the schema and the React form.

### What step 4 changed from this plan

- Change 1 (inline scripts into files) was done first, inside step 4, so that the school
  search is an edit to `design/wired/typeahead.js` rather than to the page. The scripts are
  served from `design/wired` by `app/wired/[...path]/route.ts`; the html2pdf bundle lives
  under `public/vendor` with its licence note. The lock keeps each block's original body under
  `tests/design/blocks` and checks the page is the delivered file with those blocks replaced
  by `<script src>` tags, with no inline script left.
- The school field searches through `/api/schools/search`; the page's nickname table (`SAL`)
  expands "nyu" to the full name before the search; a pick sets `window.TPSchool` and the
  tuition's source, which `costs()` passes to the engine. The prototype's static school list
  is gone.

### What step 5 changed from this plan

- Change 2: the page loads `/engine.js`; the prototype's rate history, fan maths and adapter
  live under `design/wired/prototype` and come back only with `?engine=prototype` (outside
  production, or in DEMO_MODE, which CI uses). `run()` waits for `TPEngine.ready()` before
  the reveal, within the design's 450 ms pause when the data is already there. The example is
  New York University at its published tuition, two years. The pixel test types the designer's
  sample into the bar itself, so the example's content does not move the baseline.

- Change 3: `fmt()` keeps its rupee branch character for character and hands every other
  home currency to `TPEngine.format()`, which uses the app's own formatter (locale grouping,
  minor digits, compact form for the circles), so the page and the shared page print the same
  figures. The fan chart's axis reads lakh and crore for rupees and thousands or millions
  otherwise, with the currency's symbol; the family PDF names the currency and prints the
  real rate instead of the prototype's fixed ₹95.35.

- Change 4: the three rupee-only gates are gone (`fmt()` keeps its rupee branch as a format,
  not a gate; the dollar line under the total and the exchange-rate section now key on
  "not US dollars" and "the engine has a range"). The two prototype sentences ("isn't
  connected in this prototype") became real ones. The no-history path hid nothing in the
  prototype (its selector skipped the section's only div), so the sample chart stayed on
  screen; it now hides the chart card and the range text and keeps the heading, with the
  message under it. Not changed, because it is markup: the
  section heading still reads "If the rupee moves." for every currency; see section F.

- Change 5: each cost card's icon and words come from the confidence of its biggest line
  (`lines` from the engine): solid square for government or school data, dashed circle for
  our estimate, solid dot for the student's number, with the words "Government data", "From
  your school", "Our estimate", "Your number". With the prototype adapter the page's own
  labels stay, so the pixel baseline holds.

- Change 6: six copy edits in the markup (Frankfurter for FRED in three places, the school's
  own figures for BLS, HUD as government data in the methodology table, the placeholder),
  the generic tips block removed, and the deal chips and cards rendered by
  `design/wired/deals.js` from `/api/deals` (the school's file, its city's and the national
  list, approved and fresh) in the page's own card markup. The pixel baseline for the savings
  section moves with it. Found on the way: the prototype's chip filter and the "money plan"
  checklist lived in the rate-history script that change 2 stopped loading; the chips are
  back in deals.js, the checklist had no markup left to drive.

- Change 7: the page no longer loads the html2pdf bundle; `pdf-sheet.js` inserts it from
  `public/vendor` when "Download PDF" is first pressed and falls back to the print view if it
  cannot load.

### Step 6

- `meta.shareQuery` on the engine's estimate is the shared page's own query for the same
  inputs (null when the school has no id). After the count-up, each card's figure becomes a
  link to `/estimate/breakdown?…#<category>`, the full calculation's rows for that cost, with
  an aria-label saying so. The prototype adapter has no query, so its figures stay plain.

### Step 7

- ADR 016 records the decision. The React home page and the components only it used are
  gone; the shared page, the full calculation and the privacy page keep theirs. The header's
  "Get my estimate" and "How we work it out" point at the home page's form and method; "Back
  to the result" on the full calculation goes to the shared page. The wired page gets axe,
  zero violations, before and after "Show me".

## C. The changes to the page, one by one

Only these; each is one commit, with the design lock re-run after it.

1. **Move inline scripts into files** (brief 3.1). Six blocks become six files under
   `design/wired/`: lines 323–359 → `prototype/countries.js` (country list and typeahead);
   359–395 → `prototype/fan-calc.js`; 395–482 → `prototype/fx-history.js`;
   482–538 → `engine-adapter.js` (already provided); 539–677 → `ui-and-animation.js` (already
   provided); 679–725 → `pdf-sheet.js`. The html2pdf bundle at lines 677–679 becomes
   `public/vendor/html2pdf.bundle.min.js` with its licence file. The 231 inline `style`
   attributes stay. ADR 016 records why `style-src` keeps `'unsafe-inline'`: the design is
   carried by inline styles, they cannot run code, and scripts stay nonce-only.
2. **Remove the prototype data scripts and load `engine.js`** (3.2). The three
   `prototype/*.js` tags go; `engine.js` and `engine-adapter.js` (now a thin shim over
   `window.TPEngine`, or removed if the bundle defines it directly) load in their place. The
   prototype files stay on disk for `?engine=prototype`.
3. **Currency formatting** (3.3). `fmt()` in `ui-and-animation.js` uses `Intl.NumberFormat`
   with each currency's locale and minor digits from `data/countries`; the INR branch (lakh,
   crore, `en-IN` grouping) is kept character for character.
4. **Remove the INR-only gates** (3.4). Three places: `CUR==='INR'` in `fmt()`, in
   `r-total-sub`, and in the exchange-rate block (`if(CUR==='INR'&&K.fx)` → `if(K.fx)`). The
   "not available" message stays for currencies without history.
5. **Card source labels from the engine** (3.5). The `metas[]` block in `reveal()` reads
   `K.lines` confidence per category and picks the icon: solid square (government or school
   data), dashed circle (our estimate), solid dot (your number). Same markup, same icons.
6. **Copy fixes in the markup** (3.6). "Rates from the Federal Reserve, via FRED" → Frankfurter
   (European Central Bank reference rates), three places; "BLS Consumer Expenditure Survey" →
   the school's own cost figures (College Scorecard), one place; HUD rent labelled "Government
   data" in the card and the methodology table; placeholder "e.g. Laptop, health insurance" →
   "e.g. Laptop, winter coat"; the "How students from India save in Boston" tips block is
   removed, and the deal cards render from `data/deals` (approved sources only) instead of the
   hard-coded Boston cards. Removing the hard-coded cards is the one change here that touches
   markup beyond text; see section F.
7. **Load html2pdf on click** (3.7). `pdf-sheet.js` inserts the vendor script when "Download
   PDF" is first pressed (allowed by `strict-dynamic` because a nonced script inserts it),
   then builds the sheet.

Nothing else: no class renames, no restyling, no reordering, no React on the home page.

## D. Guardrails

- **Design lock.** `tests/design/lock.test.ts` diffs `E-homepage-wired.html` against
  `tests/design/baseline.html` and allows only the hunks listed in a committed
  `allowed-diffs.json` (one entry per change in section C). Any other difference fails.
- **Computed styles.** `tests/e2e/design.spec.ts` asserts the eight key elements in
  `design/reference/computed-styles.json` (font, size, weight, width axis, letter-spacing,
  line-height, colour) and that the seven keyframes are present as the designer's browser
  parsed them. This is the handoff's proof that the width axis loaded: `h1` at 84 px,
  `font-stretch: 112%`, letter-spacing -2.94 px.
- **Visual regression with the prototype engine.** Found in step 2: the designer's PNGs in
  `design/reference/screens` were captured without the Archivo font (a fallback sans shows),
  so they cannot be the baseline. The baseline is instead a capture of the page served
  unchanged, per platform, under `design/reference/screens-served/`; the designer's PNGs stay
  for reference.
- **Visual regression, how it runs.** Playwright at 1440×900, reduced motion,
  `?engine=prototype`: before and after "Show me", each section compared with
  `design/reference/screens/1440-section-*.png` at `maxDiffPixelRatio` 0.02. Runs in CI on
  Linux, so the baseline is re-captured once on the runner (font hinting differs from macOS)
  and that capture is committed next to the designer's.
- **Engine contract tests.** zod schema for `Estimate`; `c` sums to `tot`; extras appear in
  `c.live`/`c.one` and in `tot`; `fx.lo ≤ base ≤ fx.hi`; bundle totals equal `runEstimate()`
  totals for the same inputs (unit tests, run on the built bundle).
- **End-to-end with the real engine** (demo fixtures in CI): pick a real school; the cards show
  sourced labels; adding a cost updates the total, the bubbles and the PDF sheet; a currency
  without history hides the range section with the "not available" message.
- **Accessibility.** axe with zero violations before and after "Show me". The reduced-motion
  and keyboard checks from the React suite are ported.

## E. Order and size

| Step | What                                                                      | Size       |
| ---- | ------------------------------------------------------------------------- | ---------- |
| 2    | Serve the wired page as is with the prototype adapter; pixel match proven | half a day |
| 3    | Engine bundle, data files, `/api/context`, contract tests                 | one day    |
| 4    | School search wired to the dropdown                                       | half a day |
| 5    | The seven page changes, one at a time, design lock after each             | one day    |
| 6    | Full-calculation page links from each card to its rows                    | half a day |
| 7    | Docs, ADR 016, retire the React home page                                 | half a day |

## F. Decisions needed before step 2

1. **`design/` is gitignored.** The wired page, the prototype scripts and the reference
   screenshots (8.8 MB of PNG) must be committed for the design lock and the visual tests.
   Un-ignore `design/wired` and `design/reference`?
2. **Fonts.** The page loads Archivo (with its width axis) and Noto Sans Bengali from Google
   Fonts. The policy allows styles and fonts from this site only, and the privacy page promises
   no third parties. Recommended: self-host the two font files under `public/fonts` and point
   line 36 at a local stylesheet. That is one markup change outside the brief's list, so it
   needs your OK. The alternative is to allow `fonts.googleapis.com` and `fonts.gstatic.com`
   in the policy, which sends every visitor's IP address to Google.
3. **esbuild** as a dev dependency for the engine bundle (the standing rule: ask before adding
   any dependency).
4. **Deal cards from data** (change 6): the hard-coded Boston cards are removed and the grid
   is rendered from `data/deals`, in the same card markup. Confirm this counts under 3.6.
5. **Years.** The page's stepper allows 1 to 6 years; the engine accepts 1 to 4. The engine can
   be widened to 6 (the schedule and the replay already handle any length). Widen it?
6. **Example.** "See an example first" hard-codes India, $37,500, two years, with no school.
   With the real engine it needs a school: recommended NYU, the example the app already ships.
   That is a one-line change in `ui-and-animation.js` outside the list.
7. **Overrides.** The contract carries `overrides {house, live, one, move}`, but the page has
   no control that sets them. The adapter will honour `house` (the engine's known-rent option)
   and ignore the other three, documented in the adapter comment, until the page gets controls.
8. **Shared links.** Links of the form `/?c=IN&…` open the React result today. The wired page
   does not read the query string, so during the transition those links are redirected to
   `/r?…`, which keeps working. Reading the query string into the wired page would be a later,
   separate change.
9. **"If the rupee moves."** The exchange-rate heading is markup and names the rupee for
   every currency. Changing it to name the chosen currency means a small script edit to the
   heading text (the markup keeps the rupee as its default). Recommended, with your OK.
10. **Performance gate.** The width-axis font is the one the Lighthouse work removed; with it
    back, the phone-profile score will sit near the CI floor of 90 (the GitHub runner already
    scores 88/84/89 on the React page). Decide the floor with this in mind.
11. **"Tips are examples; the live site will check them with students in each city."** The
    "Check before you go" line under the deals is markup and still describes the prototype.
    Suggested: "Deals change and some depend on your school. Check the source before you go."
    A one-line copy edit, with your OK.
12. **"Edit" from the shared page.** The home page does not read the query string, so "Edit
    the inputs" on `/r` opens an empty form. Reading `/?c=…&edit=1` into the bar (country,
    currency, school, tuition, years) is a small script edit outside the brief's list.
    Recommended, with your OK.
