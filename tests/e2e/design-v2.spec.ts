import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { record } from "./helpers/compare";

/*
 * The designer's v2 drop (design/wired/CLAUDE-CODE-PROMPT-V2.md), checked against the kit:
 *
 * 1. the motion tokens on :root equal design/reference-v2/motion-tokens.json, and every
 *    keyframe it lists is parsed;
 * 2. end states at 1440, 1024, 768 and 390 px, with reduced motion and the prototype engine,
 *    against design/reference-v2/screens (the project "design-v2" reads those PNGs directly).
 *    The kit's 2% target is measured and recorded, not gated: see helpers/compare.ts;
 * 3. axe with zero violations at 1440 and 390, before and after "Show me" and with the
 *    refine panel open; the toggle's aria-expanded, the error's role, the curtain's hands-off.
 *
 * The frames of the motion are in design-v2-motion.spec.ts.
 */
const SECTIONS = ["results", "where", "fx", "save", "how", "share"] as const;

interface Tokens {
  motionTokens: Record<string, string>;
  keyframes: string[];
}
const tokens = JSON.parse(readFileSync("design/reference-v2/motion-tokens.json", "utf8")) as Tokens;

/** The designer's sample, typed in. v2 requires a school; the prototype engine ignores it. */
async function showMe(page: Page) {
  await page.locator("#from").fill("India");
  await page.getByRole("option", { name: /^India/ }).click();
  await page.locator("#school").fill("Boston University");
  await page.locator("#tuition").fill("$37,500");
  await page.locator("#years").fill("2");
  await page.locator("#calc button[type=submit]").click();
  await expect(page.locator("#r-total")).not.toHaveText("");
  await page.evaluate(() => document.fonts.ready);
}

/** Waits for every animation and transition under `sel` to finish: axe scans a settled state. */
async function settled(page: Page, sel: string) {
  await page
    .locator(sel)
    .evaluate((el) =>
      Promise.all(
        el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
      ),
    );
}

async function settle(page: Page) {
  await page.goto("/?engine=prototype");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: /What will your/ })).toBeVisible();
}

test.describe("design v2: tokens", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("the motion tokens and keyframes are the designer's", async ({ page }) => {
    await settle(page);
    const got = await page.evaluate((names) => {
      const s = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map((n) => [n, s.getPropertyValue(n).trim()]));
    }, Object.keys(tokens.motionTokens));
    expect(got).toEqual(tokens.motionTokens);
    const keyframes = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .filter((r): r is CSSKeyframesRule => r instanceof CSSKeyframesRule)
        .map((r) => r.name),
    );
    for (const k of tokens.keyframes) expect(keyframes).toContain(k);
  });
});

for (const width of [1440, 1024, 768, 390]) {
  test.describe(`design v2: end states at ${width}`, () => {
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 }, reducedMotion: "reduce" });

    test("home and results match the reference screens", async ({ page }) => {
      await settle(page);
      await record(await page.screenshot({ fullPage: true }), ["screens", `${width}-01-home.png`]);
      // The page never scrolls sideways, at any width.
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);

      await showMe(page);
      if (width === 1440 || width === 390) {
        for (const id of SECTIONS) {
          const section = page.locator(`#${id}`);
          await section.scrollIntoViewIfNeeded();
          await record(await section.screenshot(), ["screens", `${width}-section-${id}.png`]);
        }
        await page.locator("#refine-toggle").click();
        await expect(page.locator("#refine-panel")).toHaveClass(/open/);
        await record(await page.locator("#results").screenshot(), [
          "screens",
          `${width}-section-results-refine-open.png`,
        ]);
        await page.locator("#refine-toggle").click();
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await record(await page.screenshot({ fullPage: true }), [
        "screens",
        `${width}-02-results.png`,
      ]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);
    });
  });
}

for (const width of [1181, 1300]) {
  test.describe(`design v2: between the breakpoints at ${width}`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

    test("nothing is cut off: no sideways scroll, and the bar fits", async ({ page }) => {
      // The desktop layout is a fixed 1440 px canvas; below that the fluid layout applies
      // (decision 22), so no width between the breakpoints clips the page.
      await settle(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);
      const bar = await page.locator("#calc").boundingBox();
      if (!bar) throw new Error("the bar is not laid out");
      expect(bar.x + bar.width).toBeLessThanOrEqual(width);
      await expect(page.locator("#calc button[type=submit]")).toBeInViewport();
    });
  });
}

for (const width of [1440, 390]) {
  test.describe(`design v2: accessibility at ${width}`, () => {
    // Motion on: the dimmed headings below the fold must still pass contrast (decision 16).
    test.use({ viewport: { width, height: width < 640 ? 844 : 900 } });

    test("axe passes before and after Show me and with the refine panel open", async ({ page }) => {
      const axe = () =>
        new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /What will your/ })).toBeVisible();
      // The curtain never blocks: hidden from readers, and lets every click through.
      const curtain = page.locator("#curtain");
      if ((await curtain.count()) > 0) {
        await expect(curtain).toHaveAttribute("aria-hidden", "true");
        expect(await curtain.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
      }
      // axe scans a settled page: the opening sequence fades the hero words in from 25%.
      await page.waitForFunction(() => !document.documentElement.classList.contains("intro"));
      expect((await axe().analyze()).violations).toEqual([]);

      // The error is announced: role="alert", with the field and its label marked.
      await page.locator("#calc button[type=submit]").click();
      const err = page.locator("#calc-err");
      await expect(err).toHaveAttribute("role", "alert");
      // The tuition has a default, so only the country and the school are missing.
      await expect(err).toContainText("Add where you’re from and your school to work it out.");
      await expect(page.locator("#school")).toHaveAttribute("aria-invalid", "true");
      await settled(page, "#calc-err"); // its 300 ms fade-in
      expect((await axe().analyze()).violations).toEqual([]);

      await showMe(page);
      await expect(page.locator("#r-status.ok")).toBeVisible({ timeout: 10_000 }); // the reveal's own done mark
      await settled(page, "#results");
      expect((await axe().analyze()).violations).toEqual([]);

      const toggle = page.locator("#refine-toggle");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#rent-form input")).toBeFocused();
      await settled(page, "#refine-panel");
      expect((await axe().analyze()).violations).toEqual([]);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
  });
}
