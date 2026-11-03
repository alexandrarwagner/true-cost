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

### Found after step 7

- The prototype's rate-history block also carried the page's nav behaviour and the rule that
  shows the empty state until a result. Change 2 stopped loading the block, so the empty state
  and the sticky nav's result links were missing. That code now loads from
  `design/wired/nav-and-states.js`, unchanged, and a test covers both states. The pixel tests
  never caught it because `?engine=prototype` loads that block again; the real page did not.

- On the CI runner the home page then scored 68 with a layout shift of 0.48: the empty state
  is `display: none` in the markup and shown by the designer's script, which runs after first
  paint on a slow phone, so the sections below it moved. The designer's rule now also sits in
  the head stylesheet (under the lock), so the empty state is laid out from the start. The
  Lighthouse script retries a run once when Lighthouse itself loses the trace.

### Countries (2 November, after the owner tried the UK)

- The country table now holds every country the page lists (99, the ten launch countries
  first), each with a currency Frankfurter provides; the first ten keep their snapshots and
  the rest use the adapter's live, day-cached range query. The demo fixture carries today's
  rate for each. The engine exposes `currencies()`; picking a country the engine cannot
  calculate in, or pressing Show me with one, is an error at the bar, not dollars by surprise.
  A unit test keeps the page's list and the table in step.

### Deals research (2 November)

- `scripts/research-deals.ts` and `scripts/review-deals.ts` are the savings brief's step 5.
  The research script finds official pages with Claude's web search (aggregators blocked),
  reads each page itself and keeps a draft only when its quote is on the page verbatim; the
  review script is the only path to `approved`, and a person drives it. Seven national drafts
  from 2 November sit in the review folder.

### Deals freshness (2 November, savings brief step 6)

- `scripts/check-deal-sources.ts` fetches every approved deal's page and looks for its quote;
  `.github/workflows/check-deals.yml` runs it weekly with `check:deals` and posts the report
  to one open issue, "Deals to re-check", when a quote has gone. Data changes only by a
  reviewed commit. That closes the savings brief's steps 5 and 6; ADRs 013 and 014 were
  already in place.

### Design v2 (2 November)

The designer's second drop (`design/wired/CLAUDE-CODE-PROMPT-V2.md`, `design/source/v1-to-v2.patch`)
is applied as a file swap plus a scripted re-wiring, as the kit asks:

- `scripts/build-wired.mjs` turns the export into the served page: each inline script goes
  to its file under `design/wired/` (the designer's body saved under `tests/design/blocks/`),
  each approved text edit applies exactly once, and the build refuses to finish if an inline
  script is left or a designer's script changed since the live file was merged from it
  (`tests/design/blocks.lock.json`; `--accept-blocks` after a hand merge).
- The page script was merged three ways (designer's v1, ours, designer's v2): the v2
  validation (school and tuition, field and label marked, `#calc-err` with its icon), the
  pop-in, the responsive fan chart and the refine panel, on our engine seam, currency guard,
  card labels and example. The fan chart keeps our currency symbol and units with the v2
  compact layout. `nav-and-states.js` is re-extracted (the nav pill). `deals.js` renders the
  v2 card styles and gives rendered cards the staggered landing.
- The rent override needed no engine change: `overrides.house` already becomes the
  student's monthly rent with user confidence, and the housing card already says "Your
  number" for it.
- New files, the designer's own and unchanged: `intro-flag.js`, `intro.js`, `scroll-motion.js`.

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
   heading text (the markup keeps the rupee as its default). Done on 2 November: the heading
   and the chart card's title name the chosen currency.
10. **Performance gate.** The width-axis font is the one the Lighthouse work removed; with it
    back, the phone-profile score will sit near the CI floor of 90 (the GitHub runner already
    scores 88/84/89 on the React page). Decided on 2 November: the floor stays at 90 on CI as
    well as locally; the home page scores 92 here, and a red run on the runner means the page
    needs to get lighter, not the gate lower.
11. **"Tips are examples; the live site will check them with students in each city."** The
    "Check before you go" line under the deals is markup and still describes the prototype.
    Suggested: "Deals change and some depend on your school. Check the source before you go."
    Done on 2 November, under the lock.
12. **"Edit" from the shared page.** The home page does not read the query string, so "Edit
    the inputs" on `/r` opens an empty form. Reading `/?c=…&edit=1` into the bar (country,
    currency, school, tuition, years) is a small script edit outside the brief's list.
    Done on 2 November: `/?c=…&edit=1` fills the bar's fields and runs; added costs and
    options stay on the shared page.
13. **The v2 head script.** The designer's v2 export opens with a one-line inline script in
    the head that marks the first paint for the opening sequence. The lock allows no inline
    script, so it moves to `design/wired/intro-flag.js`, loaded synchronously in the head,
    which behaves the same. Approved with defaults on 2 November.
14. **The kit's pre-wired file.** The v2 kit's `design/wired/index.html` inserts the engine
    adapter inline, which the content security policy and the lock forbid. The served page
    is built from the export by `scripts/build-wired.mjs` instead; the kit's `wire-design.py`
    stays under `design/source/` as documentation of the engine seam. Approved with defaults
    on 2 November.
15. **The file name.** The served page stays `design/wired/E-homepage-wired.html`, so the
    route, the tests and the docs are unchanged; the export is `design/source/v2-index.html`.
    Approved with defaults on 2 November.
16. **Headings dimmed below the fold.** The v2 "word by word" motion (`scroll-motion.js`)
    holds every section heading below the top third of the viewport at 25% opacity until it
    is scrolled to, which axe reports as a contrast of 1.7:1 on 60 to 84 px text (3:1 is the
    floor). Decided on 2 November: the dimmed words floor at 50% opacity
    (`design/wired/scroll-motion.js`), which keeps the effect and passes 3:1; the axe checks
    run with motion on.
17. **The kit's screens were captured without the width axis.** In every reference PNG the
    headings render at Archivo's normal width; the page specifies 112% (`computed-styles.json`,
    and the computed-style test passes), so headings wrap differently ("Where the money
    goes." is one line there, two here) and the kit's 2% target cannot be met by any build.
    The comparison is measured and recorded with side-by-sides (`tests/e2e/helpers/compare.ts`,
    `scripts/side-by-sides.mjs`), not gated; the served baselines per platform stay the pixel
    gate. Suggested: ask the designer to re-capture with the font loaded.
18. **A way into the full calculation.** The cost cards' figures link to their rows, but
    nothing on the page says the full calculation exists. The owner asked (2 November) for a
    link in the line under "How we work it out": "See your full calculation." appears once
    there is a result and opens `/estimate/breakdown` for the current estimate. One markup
    edit under the lock; the card links stay.
19. **Five pieces removed** at the owner's request (2 November): the "Prototype" line under
    the sources table, the "Five costs, added up in dollars" sentence (the full-calculation
    link stays in its place), the "Check before you go" line under the deals, the sentence
    under the PDF buttons, the "Print it" button and the footer's "Sources" link. Markup
    edits under the lock.
20. **List bars as a share of the total.** The "Where the money goes" list scaled each bar to
    the largest cost, so housing always filled the row and the lengths read wrong. Decided
    on 2 November: each bar is its share of the total, so the five add up to the row.
    Also fixed: a filter chip cleared the deal cards' column layout (`deals.js`).
21. **The focus ring crossed the field's label.** Every focused input drew a 2 px ring 6 px
    outside itself; the fields are 26 px tall with their 12 px name directly above, so the
    ring ran through the name. Decided on 2 November: the ring is drawn on the label cell
    that holds the name and the field (the designer's `label:focus-within` hook), inside the
    pill. One CSS edit under the lock.
22. **Cut off between 1181 and 1439 px.** The desktop layout is a fixed 1440 px canvas
    (`main{width:1440px}`) and the tablet layout took over only at 1180 px, so a window
    between the two was laid out for 1440 and clipped on the right. Decided on 2 November:
    the tablet layout, which is fluid, applies up to 1439 px. Revised the same evening: the
    tablet layout drops the branch lines and restyles the nav, which the owner saw as broken
    on a laptop. A scaled canvas (CSS zoom) was tried and dropped the same evening: the
    scroll-drawn line and the nav pill measure in one coordinate space and draw in another.
    Final: the stacked layout applies up to 1099 px. From 1100 to 1439 px the desktop layout
    runs at the window's width, and from 1100 to 1219 px its few fixed widths give way: hero
    padding and heading, the bar, the 1200 px results grid with its line drawings (they scale
    by their viewBox, so the tree stays on its cards), a tighter one-row nav, and the where
    section's list in place of the fixed-size bubbles, as the designer's tablet layout does.
    Below 1100 px the nav links would wrap, which is where the stacked layout earns its
    place. A test checks there is no sideways scroll at 1181 and 1300 px.
23. **A deal card reads like the designer's.** The designer's card is a figure, a title, one
    line and a source; ours also carried how to get the deal and who qualifies, which a real
    deal needs. Decided on 2 November: those two lines sit behind a "How to get it"
    disclosure inside the card (a native details element, keyboard-reachable), so the card
    keeps the designer's density without losing the information (`deals.js`).
24. **Launch metadata.** The export's head says "Direction E — homepage" and nothing else.
    For launch (2 November) the title is the site's, with a description and the sharing tags
    for tuition-plus.com, under the lock; the React pages get the same through
    `metadataBase`, and robots and sitemap routes name the domain.
25. **General tips are back.** The owner found the saving section thin without them
    (2 November). The designer's four tiles return, reworded to hold for any campus: no
    Boston neighbourhoods, no 1 September. Same markup, same stagger; the copy is in the
    lock entry. City-specific tips can follow as data once a city has its deals.
26. **The bar keeps one row down to 1040 px.** The owner prefers the one-row bar to the
    stacked one (2 November). Between 1040 and 1439 px the bar keeps its desktop shape,
    fluid up to 1160 px. Superseded the same evening by the final decision 22: the desktop
    layout keeps the one-row bar down to 1100 px, and the designer's stacked bar applies below.
27. **No scroll-drawn line in the fluid layout.** The line through the sources table's Type
    column is drawn between the type marks, which only stand apart on the 1440 canvas; in
    the stacked rows it ran through the text (owner's screenshot, 2 November). Hidden below
    1100 px (the stacked layout), as the designer hides it under reduced motion.
28. **Tips written by Claude, unreviewed.** The owner's call for the design challenge
    (2 November): "ignore the review rule for now, people won't be using it." `/api/tips`
    asks Claude for two housing tips, one living-costs tip and one moving-money tip for the
    student's country, school and city (`lib/server/tips.ts`), cached per place for a day;
    `tips.js` fills the four tiles once a result is shown. The prompt forbids prices, dates,
    laws and named companies, and the tiles keep their hand-written text in demo mode, with
    no key, or on any failure. This is the one place the site shows text no person checked;
    it should go back behind a review file before real students use it (ADR 014).
29. **The sticky nav on laptops and tablets.** The designer's stacked layout sets
    `overflow-x: hidden` on html and body, which makes the body a scroll container and stops
    `position: sticky` working; the 1220 to 1439 px range had copied the rule. Both are
    `overflow-x: clip` now (2 November), which clips without creating a scroll container.
30. **Nav spacing.** The running total never wraps; a 20 px gap separates the nav's columns
    so the total never touches the links; in the stacked layout the link row is centred and
    hugs its links instead of stretching across the page (3 November, owner's screenshots).
31. **Deals in two rows.** The grid shows eight cards and a "Show N more deals" button for
    the rest; a filter chip applies the same limit to its matches (3 November, `deals.js`).
32. **The new wordmark.** The designer's "tuition" with three layered plus marks (ink, lime,
    mint) as an inline SVG replaces the plain plus in the nav, the footer, the share card and
    the family PDF (3 November, from the designer's `E-homepage-preview (1).html`).
33. **The hero's dotted background.** A dotted field with sixteen slowly pulsing coloured dots
    sits behind the hero; `hero-bg.js`, the designer's own, fits it behind the nav and down to
    the next section, and reduced motion stills the dots (3 November, same file).
