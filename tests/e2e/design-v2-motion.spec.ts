import { expect, test, type Page } from "@playwright/test";
import { record } from "./helpers/compare";
import { anchor, FRAMES, frameName, freezeAt } from "./helpers/motion";

/*
 * The designer's motion, frame by frame, against design/reference-v2/animation (61 frames at
 * 1440 × 900): the opening sequence, the reveal, the refine panel opening, each later section
 * entering view, and the nav pill moving. See helpers/motion.ts for how a frame is frozen.
 * Each frame is measured against the kit's and recorded (helpers/compare.ts), not gated.
 */
const T0 = new Date("2026-11-02T12:00:00Z");

async function frames(page: Page, motion: string, trigger: () => Promise<void>) {
  await trigger();
  await page.waitForTimeout(50); // observers and layout settle in real time
  await anchor(page);
  let at = 0;
  for (const t of FRAMES[motion] ?? []) {
    await freezeAt(page, at, t);
    at = t;
    await record(await page.screenshot(), ["animation", `${frameName(motion, t)}.png`]);
  }
}

/** Loads the page on the fake clock, paused, with fonts in. */
async function load(page: Page) {
  await page.clock.install({ time: T0 });
  await page.goto("/?engine=prototype");
  await page.clock.pauseAt(T0.getTime() + 1000);
  await page.evaluate(() => document.fonts.ready);
}

/** Show me, then the reveal run to its end on the fake clock. */
async function results(page: Page) {
  await page.locator("#from").fill("India");
  await page.getByRole("option", { name: /^India/ }).click();
  await page.locator("#school").fill("Boston University");
  await page.locator("#tuition").fill("$37,500");
  await page.locator("#years").fill("2");
  await page.locator("#calc button[type=submit]").click();
  await page.clock.runFor(6000);
  // Finish what can finish; the page keeps a few looping animations (the sheet's tilt).
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish();
      } catch {
        a.pause();
      }
    }),
  );
  await expect(page.locator("#r-total")).not.toHaveText("");
}

test.describe("design v2: motion", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the opening sequence", async ({ page }) => {
    await frames(page, "intro", () => load(page));
  });

  test("the reveal", async ({ page }) => {
    await load(page);
    await page.clock.runFor(3000); // the opening sequence is over
    await frames(page, "reveal", async () => {
      await page.locator("#school").fill("Boston University");
      await page.locator("#tuition").fill("$37,500");
      await page.locator("#years").fill("2");
      await page.locator("#calc button[type=submit]").click();
    });
  });

  test("the refine panel opening", async ({ page }) => {
    await load(page);
    await results(page);
    await page.locator("#refine-toggle").scrollIntoViewIfNeeded();
    await frames(page, "refine-open", () => page.locator("#refine-toggle").click());
  });

  for (const id of ["where", "fx", "save", "how"]) {
    test(`the ${id} section entering view`, async ({ page }) => {
      await load(page);
      await results(page);
      await frames(page, id, () =>
        page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "start" })),
      );
    });
  }

  for (const id of ["fx", "save", "where"]) {
    test(`the nav pill moving to ${id}`, async ({ page }) => {
      await load(page);
      await results(page);
      await page.locator("#results").evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(100);
      await frames(page, `navpill-${id}`, () =>
        page.locator(`#topnav .nav-post a[data-sec="${id}"]`).click(),
      );
    });
  }
});
