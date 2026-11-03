import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/*
 * The designer's page, as served. Two checks at the board's 1440 px with reduced motion and
 * the prototype engine:
 *
 * 1. Computed styles of the key elements match design/reference/computed-styles.json (font,
 *    size, weight, width axis, letter-spacing, line-height, colour), and the seven keyframes
 *    are present as the designer's browser parsed them. This is the proof the handoff asks
 *    for: "h1 at 84px, font-stretch 112%, letter-spacing -2.94px".
 * 2. Pixel comparison, before and after "Show me", against design/reference/screens-served,
 *    captured from this page the first time it was served unchanged (the designer's own PNGs
 *    in design/reference/screens were captured without the Archivo font, so they cannot be
 *    the baseline). The baseline is per platform; CI re-captures its own once.
 */
const SECTIONS = ["results", "where", "fx", "save", "how", "share"] as const;

/** The designer's sample: India, $37,500 a year, two years, and a school (v2 requires one). Typed in, so the example can change. */
async function showMe(page: Page) {
  await page.locator("#school").fill("Boston University");
  await page.locator("#tuition").fill("$37,500");
  await page.locator("#years").fill("2");
  await page.locator("#calc button[type=submit]").click();
}
const RATIO = 0.02;

interface Expected {
  sel: string;
  font: string;
  size: string;
  weight: string;
  stretch: string;
  ls: string;
  lh: string;
  color: string;
}
interface Reference {
  elements: Expected[];
  keyframes: string[];
}
const reference = JSON.parse(
  readFileSync("design/reference/computed-styles.json", "utf8"),
) as Reference;

test.describe("the designer's page, as served", () => {
  test.skip(({ isMobile }) => isMobile, "desktop width only; the mockup is desktop-only");
  // Own rate-limit bucket per test: the suite as a whole sits near the general tier's 30 calls a minute.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.93.${process.pid % 250}.${n}` });
  });
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("key elements compute to the designer's styles, and the keyframes are intact", async ({
    page,
  }) => {
    await page.goto("/?engine=prototype");
    await page.evaluate(() => document.fonts.ready);
    // The designer measured the home state; the result's elements exist only after "Show me".
    const afterShowMe = new Set(["#r-total", "#r-tui", ".bub"]);
    const check = async (e: Expected) => {
      const got = await page
        .locator(e.sel)
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            // The metrics-matched fallback faces sit in the stacks for a shift-free swap;
            // the designer's record predates them.
            font: s.fontFamily.replace(/,\s*"?Archivo Fallback( Wide)?"?/g, ""),
            size: s.fontSize,
            weight: s.fontWeight,
            stretch: s.fontStretch,
            ls: s.letterSpacing,
            lh: s.lineHeight,
            color: s.color,
          };
        });
      expect(got, e.sel).toEqual({
        font: e.font,
        size: e.size,
        weight: e.weight,
        stretch: e.stretch,
        ls: e.ls,
        lh: e.lh,
        color: e.color,
      });
    };
    for (const e of reference.elements) if (!afterShowMe.has(e.sel)) await check(e);
    await showMe(page);
    await expect(page.locator("#r-total")).not.toHaveText("");
    await page.evaluate(() => document.fonts.ready);
    for (const e of reference.elements) if (afterShowMe.has(e.sel)) await check(e);
    // The font really loaded: the heading is wider than the same text at normal width.
    const widths = await page.locator("h1").evaluate(async (el) => {
      const wide = el.getBoundingClientRect().width;
      await document.fonts.load("500 84px Archivo");
      return { wide, loaded: document.fonts.check("500 84px Archivo") };
    });
    expect(widths.loaded).toBe(true);
    expect(widths.wide).toBeGreaterThan(1000);

    const keyframes = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .filter((r) => r instanceof CSSKeyframesRule)
        .map((r) => r.cssText),
    );
    for (const k of reference.keyframes) expect(keyframes).toContain(k);
  });

  test("before and after Show me, each section matches the served baseline", async ({ page }) => {
    await page.goto("/?engine=prototype");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: /What will your/ })).toBeVisible();
    expect.soft(await page.screenshot({ fullPage: true })).toMatchSnapshot("home-full.png", {
      maxDiffPixelRatio: RATIO,
    });

    await showMe(page);
    await expect(page.locator("#r-total")).not.toHaveText("");
    await page.evaluate(() => document.fonts.ready);
    // The sticky nav overlaps whichever section is captured, at a position that drifts by a
    // few pixels between runs; it has its own test, so it is hidden for the section shots.
    const hideNav = await page.addStyleTag({ content: "#topnav{visibility:hidden}" });
    for (const id of SECTIONS) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      expect.soft(await section.screenshot()).toMatchSnapshot(`section-${id}.png`, {
        maxDiffPixelRatio: RATIO,
      });
    }
    await hideNav.evaluate((el) => el.parentNode?.removeChild(el));
    await page.evaluate(() => window.scrollTo(0, 0));
    expect.soft(await page.screenshot({ fullPage: true })).toMatchSnapshot("results-full.png", {
      maxDiffPixelRatio: RATIO,
    });
  });
});
