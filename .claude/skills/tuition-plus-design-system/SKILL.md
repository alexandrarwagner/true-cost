---
name: "tuition-plus-design-system"
description: "Tuition+ design system: brand tokens, components, content rules and WCAG 2.2 AA checks. Use when designing, building or reviewing any Tuition+ page, chart, PDF or asset."
---

# Tuition+ design system

Tuition+ is a free site that shows international students the full cost of a US degree in their own currency. It should feel calm, honest and global, never like a bank or a trading app. Use these tokens exactly, and run the accessibility checks before calling any work done.

## 1. Non-negotiable content rules

- **Never predict exchange rates.** Show what past rates did ("in 8 of 10 past periods…"), always labelled "Not a prediction".
- **Every number shows its source.** Mark each cost as _Official data_ (small solid square) or _Our estimate_ (dashed circle). Something the student typed is _Your number_ (solid dot).
- **Never invent figures, deals, quotes or sources.** Sample figures are labelled as samples. Deals link to where they were found, with a "Checked [month year]" date.
- **Banned imagery:** flags, landmarks, graduation caps, piggy banks, cash or coins, globes with planes. Also no red/green "trading" colours and **no gradients**.
- **Copy:** plain, short sentences. No meta-labels ("SECTION 01"). Headlines stay within 2 lines.
- **Rupees:** Indian grouping (₹1,27,48,295), with short forms in lakh and crore (₹15.5 lakh, ₹1.27 crore). Always show dollars alongside.

## 2. Colour tokens

| Token             | Hex               | Use                                                          |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| `--bg`            | #F2F3F5           | Page background (cool grey)                                  |
| `--surface`       | #FFFFFF           | Cards, form pill, chart cards                                |
| `--ink`           | #14151F           | Body text, headings, icons                                   |
| `--muted`         | #4A4B63           | Secondary text on light surfaces                             |
| `--dark`          | #2A2340           | Plum: buttons, dark sections, total card                     |
| `--muted-on-dark` | #C4C6CE           | Secondary text on plum                                       |
| `--lime`          | #DDFF7A           | Living costs; highlight numbers on plum; primary CTA on plum |
| `--tuition`       | #8F93F2           | Tuition                                                      |
| `--housing`       | #C9CBFA           | Housing; chart range band                                    |
| `--one-off`       | #F7B9EE           | One-off costs                                                |
| `--moving`        | #9FEADA           | Moving money                                                 |
| `--chart-line`    | #3E43C8           | "At today's rate" line; focus ring                           |
| `--chart-worst`   | #C2418F           | "Worst tenth" dashed line                                    |
| `--callout`       | #FCE4F8           | Buffer callout box                                           |
| `--divider`       | #DCDDE3 / #E4E5EA | Rules and borders                                            |

Cost colours always mean the same cost, everywhere (tags, bubbles, bars, PDF). Never reuse them for anything else.

## 3. Type

- **Font:** Archivo (Google Fonts, `wdth,wght@62..125,100..900`). Add Noto Sans Bengali as a fallback for ৳.
- **Display style (`.d`):** `font-stretch:112%; font-weight:500; letter-spacing:-0.035em`.
- **Numbers (`.num`):** `font-variant-numeric: tabular-nums`.
- **Scale (desktop):**

| Role        | Size                       |
| ----------- | -------------------------- |
| Hero        | 84px                       |
| Section H2  | 52–60px                    |
| H3          | 30px                       |
| Big numbers | 34–76px                    |
| Lead        | 20–22px                    |
| Body        | 15–18px                    |
| Small       | 13–14px (never below 12px) |

## 4. Layout, shape, motion

- **Width:** 1440 desktop frame. Content is 1200 wide (120px side padding); sections have 160px top padding.
- **Radius:** cards 24–32px, pills and buttons fully round.
- **Shadows:** neutral only, `rgba(17,20,30,0.06–0.08)`. Never tinted purple.
- **Logo:** "tuition" in Archivo display, with a small raised "+" in `--tuition`.
- **Motion:**
  - Content is visible by default; animate _from_ hidden using `animation-fill-mode: backwards`.
  - Staged reveal after "Show me": the tuition card, then the branch lines, then the four cost cards, then the total, with numbers counting up.
  - Charts draw left to right when scrolled into view.
  - Bubbles scale to 1.08 on hover or focus.
  - Always add `@media (prefers-reduced-motion: reduce)` that removes the motion and shows the end state.

## 5. Components

- **Nav:** sticky, frosted `rgba(242,243,245,.86)`.
  - Before results: the logo, "How we work it out" and a "Get my estimate" button.
  - After results: section links (Breakdown, Where it goes, Exchange rate, Saving tips, How we work it out, Share), the total and "Edit". The current section has a plum pill.
- **Hero form pill:** white, 92px tall, radius 46. Fields: I'm from (fill-in list with currency chip), My school (fill-in list), Tuition per year, Years (− n + stepper). Ends with a plum "Show me" button.
- **Empty state:** a dashed outline of the breakdown, "Your estimate will appear here", and an "Enter my details" button.
- **Breakdown:**
  - A tuition card branches into four centred cost cards (category tag, amount sized to fit, source line), which rejoin into the plum total card.
  - The total is in lime, with a "Hidden costs: X% on top of tuition" pill.
  - Below it, "Know a cost we missed?" uses the same pill style: what it is, amount, one time or monthly, and Add.
- **Where the money goes:** a plum section.
  - Glowing bubbles whose area matches each cost's share, with labels inside.
  - A "See as chart" toggle switches to a bar list: name and amount, a bar in the cost colour, then the detail and source.
- **If the rupee moves:**
  - Left column: the "8 of 10 past periods" sentence, the legend, the pink buffer callout and the note.
  - Right card: a cumulative-spend chart showing today's rate (solid), the middle 80% (band) and the worst tenth (dashed).
- **Saving section:** "General tips" as four columns under a black rule, then "Student deals" with filter chips and white deal cards (icon, deal, place, condition, source link).
- **How we work it out:** a white table with columns Cost, How we work it out, Source, Type.
- **Share:** a plum band with "Download PDF" (lime) and "Print it", next to a tilted preview of the A4 sheet.

## 6. Accessibility checks (WCAG 2.2 AA) — run every time

**Known-good contrast pairs** (text needs at least 4.5:1, large text and meaningful graphics at least 3:1):

| Foreground    | Background | Ratio |
| ------------- | ---------- | ----- |
| ink           | bg         | 16.4  |
| muted         | bg         | 7.6   |
| muted         | white      | 8.5   |
| white         | plum       | 14.9  |
| muted-on-dark | plum       | 8.7   |
| lime          | plum       | 13.2  |
| ink           | lime       | 16.1  |
| ink           | housing    | 11.6  |
| ink           | one-off    | 11.4  |
| ink           | moving     | 13.2  |
| ink           | tuition    | 6.6   |
| ink           | callout    | 15.2  |
| chart-line    | white      | 7.4   |
| chart-worst   | white      | 4.7   |

**Never:**

- put white text on the pastel cost colours;
- use `--housing` (#C9CBFA, 1.6:1 on white) as the _only_ way to tell something apart; always pair it with a label or legend;
- put `--muted` on plum.

**Checklist:**

1. **Contrast:** compute every new colour pair. Don't eyeball it.
   `L(c)`: for each channel `v=c/255; v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)^2.4`; `L = 0.2126R + 0.7152G + 0.0722B`. Ratio = `(L1+0.05)/(L2+0.05)`.
2. **Automated scan:** run axe-core with Playwright on the page, both before and after "Show me", with tags `wcag2a, wcag2aa, wcag21aa, wcag22aa`. Zero violations required. Then check "incomplete" items by hand (text on bubbles and over images).
3. **Focus:** tab through the whole page. Every interactive element shows a visible focus ring (`outline: 2px solid #3E43C8; outline-offset: 3px`). Inline `outline: none` must be overridden with `:focus-visible { ... !important }`.
4. **Target size:** controls are at least 24×24px, and 44px preferred for buttons and links on their own.
5. **Keyboard:**
   - Fill-in lists use `role=combobox` and `listbox`, with arrows, Enter and Esc.
   - Toggle buttons use `aria-pressed`.
   - Charts are focusable or have a text or list alternative.
6. **Charts:** each has `role="img"` and an `aria-label` that states the key numbers. There's a legend for 2 or more series, and identity never relies on colour alone.
7. **Live updates:** the staged results narrate through an `aria-live="polite"` status line.
8. **Motion:** `prefers-reduced-motion` removes all movement, and nothing auto-plays for more than 5 seconds without a stop.
9. **Forms:** every input has a visible label. Errors use `role=alert`, plain words and `aria-invalid`.
10. **Reflow (1.4.10):** pages must work at 320px wide with no horizontal scrolling. The current 1440px desktop layout does NOT pass yet. Every page needs a mobile layout before launch (see the mobile views board).
11. **Language and structure:** `<html lang>` is set, the heading order is logical, and the `nav` and `main` landmarks are present.
12. **Links:** external source links open in a new tab, and need a visible "opens in new tab" cue or `aria-label`.

Report results as: what was tested, what passed, what failed (with the WCAG criterion), and what still needs a human check.
