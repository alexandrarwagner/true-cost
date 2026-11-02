# Claude Code prompt: my HTML is the front end; you connect the engine

> Put this folder in the repo at `design/wired/`, then paste everything below this line into Claude Code.

---

**New approach.** Stop rebuilding the home page in React. My page, `design/wired/E-homepage-wired.html`, **is** the front end. Your job is to connect it to our real cost engine without changing how it looks or moves.

I've already prepared the page. Every number it shows now comes from one object, `window.TPEngine`, defined in `design/wired/engine-adapter.js`. Right now that adapter holds the old prototype logic (sample Boston prices, rupees only), so the page looks exactly as before. The full contract is in the comment at the top of `engine-adapter.js`.

**Don't write code until I approve your plan (step 1).**

## 1. Plan first

Read `engine-adapter.js`, `ui-and-animation.js` and `E-homepage-wired.html`, then tell me:

- how you'll serve my page at `/` from our Next.js app. For example, the HTML as a static file, with a rewrite from `/`. The markup must stay as written;
- how you'll build the engine into a browser file (e.g. esbuild bundling `lib/core` into `public/engine.js` that defines `window.TPEngine`);
- every change you need to make to my HTML or JS, listed one by one. **Only the changes in section 3 are allowed.** Anything else needs my OK.

## 2. Build the real engine behind the same contract

- `TPEngine.estimate(input)` must return the same shape the page already uses (`c`, `tot`, `exM`, `exO`, `o`, `fx`, `meta`), computed by `runEstimate()` from `lib/core`. Same totals as the React app for the same inputs.
- **Extend it** (additive only, so nothing breaks):
  - `lines`: every line item with name, amount, phase, source, `checkedOn`, confidence (`user` / `school` / `government` / `estimate`) and the derivation;
  - `fx` for **every currency we support**, not just INR, from the Frankfurter snapshot. `null` if there's no history for that currency;
  - `meta.sampleNote`: replace "Boston prices as a sample" with the real basis, e.g. "Rent and living costs for New York, NY".
- **Data:** the engine runs in the browser from public data snapshots (static JSON: HUD rents, Scorecard costs, FX history, constants). No keys in the browser.
- **School search:** wire the existing `#school` field and `#school-list` dropdown to a server route `/api/schools?q=` that calls College Scorecard with the server-side key. The chosen school resolves to a real UNITID, which goes into `estimate()`.
- Keep `version` on the adapter (e.g. `engine-1.0.0` with `WEIGHTS_VERSION`/data snapshot dates) so the PDF and footer can show which data was used.

## 3. The only changes allowed to my page

1. **Move inline `<script>` blocks into files** so we can keep a strict CSP for scripts. Inline `style` attributes stay as written; note in an ADR that `style-src` needs `'unsafe-inline'` because of them, and why that's acceptable.
2. **Remove the prototype data scripts** (country list, FX history, `fanCalc`) once the engine provides the same things, and load `engine.js` instead.
3. **Currency formatting:** generalise `fmt()` in `ui-and-animation.js` to any currency with `Intl.NumberFormat`, keeping the Indian lakh/crore formats exactly as they are for INR.
4. **Remove the INR-only gates** (`CUR==='INR'`) so the exchange-rate section works whenever `K.fx` isn't null.
5. **Card source labels:** the four cost cards currently hard-code "Government data", "Visa, deposits, flights" and "Our estimate · bank fees". Drive them from the engine's confidence values instead, using the same icons (solid square = official data, dashed circle = our estimate, solid dot = your number).
6. **Copy fixes** in the markup:
   - "Rates from the Federal Reserve, via FRED" becomes Frankfurter (European Central Bank reference rates);
   - "BLS Consumer Expenditure Survey" becomes the school's own cost figures (College Scorecard);
   - HUD rent is labelled government data;
   - the "e.g. Laptop, health insurance" placeholder becomes "e.g. Laptop, winter coat";
   - remove the generic "How students from India save in Boston" tips; deals only from approved official sources.
7. **Load html2pdf only when "Download PDF" is clicked,** not on page load.

Nothing else changes: no class renames, no restyling, no reordering, no React rewrite of the home page.

## 4. Guardrails so the design can't drift

- **Design lock:** a test that fails if `E-homepage-wired.html`'s markup or CSS changes outside the allowed edits. Diff against a committed baseline and list the allowed differences.
- **Visual regression with a fixed engine:** add `?engine=prototype` (development and test only) that loads the original prototype adapter. With it, Playwright screenshots at 1440px must match `design/reference/screens/` (≤2% difference), before and after "Show me", with reduced motion. This proves the design is untouched while the real engine changes the numbers.
- **Engine contract tests:**
  - zod schema for `Estimate`;
  - `c` sums to `tot`;
  - user extras appear in `c.live`/`c.one` and the total;
  - `fx.lo ≤ base ≤ fx.hi`;
  - the same inputs give the same totals as `runEstimate()` in Node.
- **End-to-end tests with the real engine:**
  - pick a real school;
  - the cards show sourced labels;
  - adding a cost updates the total, the bubbles and the PDF;
  - a currency without history hides the range section with the "not available" message.
- **Accessibility:** axe with zero violations, before and after "Show me".

## 5. Keep in the Next.js app

The API routes (schools, optional AI letter extraction), the full-calculation page (`/estimate/breakdown`, server-rendered from the same engine), `/privacy` and `/api/health`. Retire the React version of the home page once the wired page passes all tests.

## 6. Order

1. Plan (wait for my OK).
2. Serve the wired page as is, with the prototype adapter, and confirm a pixel match.
3. Engine bundle plus contract tests.
4. School search route.
5. The allowed page changes from section 3, one at a time, re-running the design lock after each.
6. The full-calculation page links from each card to its rows.
7. Docs and an ADR: "The designer's HTML is the front end; the engine is a headless module behind `window.TPEngine`".
