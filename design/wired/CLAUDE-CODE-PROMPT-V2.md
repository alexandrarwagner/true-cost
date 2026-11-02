# Claude Code prompt: apply design update v2 exactly

> Unzip this kit into the repo root, then paste everything below this line into Claude Code.

---

I've updated the design. **Don't re-implement anything by eye.** My HTML is the front end, so this update is a file swap plus re-wiring, checked against new reference screenshots.

## What's in this kit

| Path | What it is |
|---|---|
| `design/source/v2-index.html` | My new design export, untouched. |
| `design/wired/index.html` | The same file, already wired to `window.TPEngine` by the script below. I've verified it behaves identically to my export: same numbers, same exchange-rate range, same screenshot. |
| `scripts/wire-design.py` | Re-wires any future design export automatically. It fails loudly if the engine seam has moved. |
| `scripts/engine-adapter.js` | The adapter contract (unchanged from v1). |
| `design-update-v2.patch` | Exact diff from v1 to v2 (html2pdf bundle omitted). Read this; it's the full list of changes. |
| `design/reference-v2/screens/` | End states at **1440, 1024, 768 and 390px**, plus each section and the refine panel open, at 1440 and 390. |
| `design/reference-v2/animation/` | 61 frames: opening curtain, reveal, refine panel opening, sections entering view, nav pill moving. |
| `design/reference-v2/motion-tokens.json` | The motion tokens and the list of keyframes. |

## What changed in v2 (from the patch)

1. **Motion tokens** in `:root`: `--dur-xs` 120ms, `--dur-sm` 300ms, `--dur-md` 500ms, `--dur-lg` 700ms, `--dur-draw` 1800ms, `--ease-out`, `--ease-in-out`, `--ease-slide`, `--ease-pop`, `--stagger-sm` 60ms. All existing animations now use them.
2. **Opening sequence** on first paint: a plum curtain lifts, the hero words darken, the fields land and the placeholder types. It uses a tiny inline script in `<head>` that adds `html.intro`, plus a new script at the end. It's skipped with reduced motion and when results are showing.
3. **"Make this number more accurate"** replaces "Know a cost we missed?". It's a disclosure link under the total (`#refine-toggle`, `.refine-link`) that opens `#refine-panel` with two forms:
   - **Replace our rent estimate** (`#rent-form`, `#rent-reset`): sets the student's monthly rent. This is `overrides.house` in the engine contract, and must show as "Your number".
   - **Add a cost we missed:** the existing extras form.
4. **Nav pill** that slides between section links (`.nav-pill`, `--ease-slide`).
5. **Staggered landing** for tiles and deal cards (`.tile`, `.deal`, `.pre`/`.seen`), plus a hover lift on deals.
6. **Pop-in** (`.pop`, `--ease-pop`) for the hidden-costs pill and source tags.
7. **A scroll-drawn line** through the Type column of "How we work it out" (`.how-line`, `.how-mark`), with a new script.
8. **New error state** for the form: `#calc-err` with an icon, red label and placeholder, and an `errin` animation.
9. **Responsive layout:** breakpoints at 1180px (tablet), 640px (phone) and 400px. On small screens the bubbles become the list view, and the breakdown branch lines are hidden. **The page now passes at 390px with no horizontal scroll.** This replaces my earlier instruction to propose a mobile layout: use mine.
10. **Copy:** new headings and helper text in the refine panel (see the patch).

## What to do

1. **Plan first.** Tell me how your current version of the page differs from `design/wired/` in v1 (e.g. scripts you've moved to files, `fmt()` changes, copy fixes, card labels). Wait for my OK.
2. **Swap, don't merge by hand.** Make `design/source/v2-index.html` the new source. Run `python3 scripts/wire-design.py design/source/v2-index.html design/wired/index.html`. Then re-apply the same allowed edits as before, as a **scripted, repeatable step**: a build script, not hand edits. Next time I drop a design, the whole pipeline should be `wire-design.py` plus that build step.
3. **Engine:** make sure `overrides.house` (monthly rent from the new rent form) flows into the real engine as the student's own rent, with confidence `user`, and the housing card switches to "Your number". "Back to our estimate" (`OV.house = null`) restores the HUD figure.
4. **Update the design lock baseline** to v2. Allowed differences from the source are still only the ones in the earlier brief.
5. **Visual regression against `design/reference-v2/`,** using the prototype engine (`?engine=prototype`):
   - end states at 1440, 1024, 768 and 390px, with reduced motion; ≤2% difference;
   - motion: freeze CSS animations at the frame times with `document.getAnimations()` and compare against the frames for the reveal, refine panel, sections entering view and nav pill. Use the same test hook as before for JS-driven motion (count-ups, curtain, how-line);
   - check computed motion tokens equal `motion-tokens.json`.
6. **Accessibility:** axe with zero violations at 1440 and 390, before and after "Show me", and with the refine panel open. Check that `#refine-toggle` updates `aria-expanded`, the error uses `role="alert"`, and the curtain never blocks interaction or screen readers.
7. Send me side-by-sides (reference vs build) for the opening, the reveal, the refine panel and the 390px results.

## Still to fix in my copy (carry over)

The v2 design still says "Federal Reserve, via FRED" and "BLS Consumer Expenditure Survey", labels HUD rent as "Our estimate", and shows the generic Boston tips. Keep applying the copy fixes from the earlier brief in the build step.
