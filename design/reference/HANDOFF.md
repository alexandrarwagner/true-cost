# Design handoff: port the mockup exactly

This folder is the source of truth for how Tuition+ looks and moves. **This replaces my earlier instruction to treat the mockup as a "visual reference only".** That instruction is why the build drifted. From now on, port the design; don't reinterpret it.

## What's in this folder

| File | What it is |
|---|---|
| `E-homepage-original.html` | The full mockup. Open it in a browser to see the real thing. ~1MB because it inlines html2pdf. |
| `markup.html` | The page body with scripts removed. Most styling is **inline** on elements, so the markup carries the design. |
| `styles.css` | Every `<style>` block, in order, including the 7 `@keyframes` (pulse, draw, land, bub, tilt, pg, ln). |
| `ui-and-animation.js` | The real interaction and animation logic: staged reveal, count-ups, observers, reduced motion. |
| `pdf-sheet.js` | The family PDF sheet builder. |
| `prototype-*.js` | The prototype's own data and maths (country list, FX history, fan calc). **Reference only.** The real numbers come from our engine. |
| `computed-styles.json` | Computed font, size, weight, stretch, letter-spacing and colours for key elements, plus the keyframes as the browser parsed them. |
| `screens/` | End-state screenshots at 1440px (home, results, each section) and 390px. |
| `animation/` | Frames of the reveal after "Show me" (0–4000ms), and the bubbles and exchange-rate chart entering view. |

## Why the build looked different (fix all of these)

1. **Reinterpreting instead of copying.** Values were rebuilt from scratch instead of copied. Copy exact pixel values, colours, radii, shadows, letter-spacing and line-heights from `markup.html` and `styles.css`.
2. **The font's width axis.** Headings use Archivo at `font-stretch: 112%`. That only works if the variable font is loaded **with its `wdth` axis**.
   - With `next/font/google`: `Archivo({ subsets: ['latin'], axes: ['wdth'], display: 'swap' })`, plus Noto Sans Bengali as a fallback.
   - Check that the computed `font-stretch` on `h1` is `112%` and the heading's rendered width matches `screens/1440-01-home-full.png`. If it looks narrower, the axis didn't load.
3. **Tailwind approximations.** Don't round to the nearest Tailwind class (e.g. `tracking-tight` is not `-0.035em`). Use arbitrary values (`tracking-[-0.035em]`), CSS variables or a CSS module with the exact values.
4. **Tailwind preflight resets.** Preflight changes button, heading, list and image defaults. Compare computed styles against `computed-styles.json`, and override where they differ.
5. **Re-created animations.** Keep the original keyframes, durations, delays, easing curves and stagger order exactly. Don't swap in a motion library's defaults. Port the logic in `ui-and-animation.js` to React hooks line by line:
   - same IntersectionObserver thresholds;
   - same requestAnimationFrame count-up duration and easing;
   - same reduced-motion behaviour (final state shown at once).

## Rules

- **Port, don't redesign.** Keep the DOM structure and section order. If something can't be ported exactly, stop and tell me why before changing it.
- **Data comes from our engine**, not the prototype scripts. Wire the UI to `runEstimate()`. Never copy prototype figures into the app.
- **Keep the content fixes** from the earlier brief:
  - exchange rates are from Frankfurter (ECB), not FRED;
  - living costs come from the school's own figures (College Scorecard), not BLS;
  - HUD rent is labelled "government data";
  - no generic tips;
  - deals only from official sources.
- **Mobile is new work.** The mockup is desktop-only: the 390px screenshots show it overflowing. Don't match those. Propose a mobile layout using the same tokens and components, and show me before building it.

## How to check: visual regression, section by section

Work one section at a time (nav and hero, empty state, breakdown, where the money goes, exchange rate, saving, how we work it out, share). For each:

1. **End state.** Run Playwright at 1440×900 with `reducedMotion: 'reduce'`, using the sample/demo data. Screenshot the section and compare it with `screens/1440-section-*.png` using `expect(locator).toHaveScreenshot()` or pixelmatch. Target `maxDiffPixelRatio` ≤ 0.02 (allowing for font anti-aliasing). Iterate until it passes.
2. **Animation.** With motion on, compare key moments against `animation/`:
   - Freeze CSS animations deterministically: `document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; })`.
   - JS count-ups aren't Web Animations, so expose a test-only hook (e.g. `window.__setRevealTime(ms)`) in development builds only.
   - Check the order and timing of the reveal: tuition card → branch lines → four cost cards → total, matching the 0–4000ms frames.
3. **Computed styles.** Assert key elements match `computed-styles.json`: font-family, size, weight, stretch, letter-spacing, line-height, colours.
4. After each section, send me the side-by-side (reference vs build) and the diff percentage.

Add these comparisons to CI so the design can't drift again.

## Order of work

1. Font and tokens. Prove `h1` matches (font-stretch 112%, letter-spacing −2.94px at 84px).
2. Nav and hero, then the empty state.
3. Breakdown and the staged reveal: the magic moment, so check it against the frames.
4. Where the money goes (bubbles and chart toggle), then the exchange-rate chart.
5. Saving, how we work it out, share and PDF.
6. Mobile proposal, which needs my approval first.
