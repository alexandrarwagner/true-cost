# Accessibility, motion, print and performance report

Format per the Tuition+ design system, section 6. Run on 1 November 2026 against the
production build in DEMO_MODE, on the Playwright Pixel 7 and desktop profiles, after redesign
step 8. Everything under "automated" re-runs in CI on every push.

## What was tested

**Automated, in CI**

- axe-core (`@axe-core/playwright`) with tags `wcag2a, wcag2aa, wcag21aa, wcag22aa` on: the
  empty home page; the home page after "Show me" with two levers switched on; the shared page
  `/r`; the full-calculation page `/estimate/breakdown`. Zero serious or critical violations
  is the gate.
- Contrast: every text/background pairing the theme uses, computed from `app/globals.css` in
  `tests/unit/tokens.test.ts` (formula per the design system). All body-text pairs are at
  least 4.5:1; the two large-text-only pairs are recorded and kept off body copy.
- Keyboard: the skip link reaches the form; the school field is a combobox driven by arrow
  keys, Enter and Escape; a focus walk over the first forty stops on the result page checks
  that every `:focus-visible` element shows the 2 px brand ring.
- Reflow (1.4.10): no horizontal scroll at 320 px on the empty page and on the result page
  with the range table open, measured after web fonts settle; the result page is also checked
  on the 412 px Pixel profile.
- Motion: with `prefers-reduced-motion: reduce` the tree's stages are fully visible at
  once and the status line shows its final text; the count-up never runs.
- Live updates: the staged reveal narrates through one `role="status"` line; lever switches
  announce the new total the same way.
- Print: the breakdown page hides the header, nav and report link, keeps the method section,
  and breaks the page per category (structural check; no pixel snapshot, because fonts differ
  between macOS and the Linux runners).
- Lighthouse 13.5 on the phone profile, median of three runs with the CPU throttle calibrated
  to the host, gated at performance 90, accessibility 95, best practices 90 (`npm run perf`).

**By hand, this run**

- Tab through the whole home page and result at desktop width.
- Phone layouts at 375 px and 320 px for the hero, bar, tree, shares, exchange-rate section,
  deals grid, methodology table and the breakdown page.

## What passed

| Check                                    | Result                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| axe, four pages, full WCAG 2.2 tag set   | 0 serious or critical violations                                                                                                                |
| Contrast, all theme pairings             | pass (tokens test)                                                                                                                              |
| Focus ring on every keyboard stop        | pass (40 stops, result page)                                                                                                                    |
| Reflow at 320 px, empty and result pages | pass                                                                                                                                            |
| Reduced motion                           | pass                                                                                                                                            |
| Print view of the full calculation       | pass (structural)                                                                                                                               |
| Lighthouse, home                         | performance 91, accessibility 100, best practices 96                                                                                            |
| Lighthouse, result                       | performance 91, accessibility 100, best practices 96                                                                                            |
| Lighthouse, full calculation             | performance 94, accessibility 100, best practices 100                                                                                           |
| Target size (2.5.8)                      | switches 24 px, remove buttons 24 px, stepper 32 px, pills 44 px                                                                                |
| Charts                                   | `role="img"` with a label stating the key numbers; a table alternative for the range chart; a text description with every share for the circles |
| External links                           | open in a new tab with a spoken "opens in a new tab" cue                                                                                        |
| Language and landmarks                   | `lang="en"`, `banner`, `main`, `contentinfo`, `navigation` present                                                                              |

## What failed, and what changed

- **Heading order (1.3.1, Lighthouse `heading-order`)**: the empty home page went h1 → h3
  through the letter box. The letter box heading is now an h2.
- **Performance**: home 89 and result 91 before this step, and 88 and 84 on the GitHub runner.
  Three changes: the Bengali font (86 KB) is no longer preloaded for every visitor; Archivo
  is loaded without its width axis, which took each file from 85-90 KB to 33-35 KB. The
  design system's 112% display stretch was then tried two more ways: a second, late-loaded wide
  face with `font-display: swap` shifted every heading when it arrived (CLS 0.147, performance
  83), and the same face as `optional` had no shift but still lengthened the simulated largest
  paint (performance 88). The stretch stays out; and the chart chunk loads only when
  the exchange-rate section is near the viewport. Now 95, 95 and 97 on this machine. In CI the
  script takes the median of three runs and calibrates the CPU throttle to the runner's
  benchmark index, per Lighthouse's throttling guide, so a slow runner is not scored as a slow
  phone.
- **Reflow**: three regressions were caught by the 320 px checks during steps 5 to 7 (the
  share link's unbreakable URL, the exchange-rate card's table widening its grid column, the
  methodology table's minimum width) and fixed before merge.

Nothing is failing at the time of writing.

## Still needs a human check

1. **Screen reader pass** with VoiceOver on iOS and NVDA on Windows: the tree narration, the
   lever switches, the combobox and the stacked breakdown rows. axe cannot judge whether the
   reading order and announcements make sense.
2. **"Incomplete" axe items**: text over the shares circles and the category chips are flagged
   as needing manual review of contrast; the tokens test covers the pairs used, but check the
   rendered page once on a real device.
3. **Best practices 96** on the home and result pages: Lighthouse reports two back/forward-cache
   blockers and a Content-Security-Policy note about `'unsafe-inline'` for styles, which Next's
   font loader needs. Both are known and accepted for now.
4. **Colour on charts**: the exchange-rate chart distinguishes the three series by solid, band and
   dashed strokes and has a legend; confirm the dashed worst-tenth line reads on a phone.
5. **Motion**: the shares circles scale on hover; nothing auto-plays, but check the staged reveal
   feels right on a mid-range Android phone.
6. **The mobile views board** mentioned by the design system has not been received; the phone
   layouts follow the responsive rules in the redesign proposal.
