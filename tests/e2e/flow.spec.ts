import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * The server-rendered pages: the shared result (/r), the full calculation
 * (/estimate/breakdown) and the shell around them. The home page is the designer's HTML;
 * its tests are in wired.spec.ts and design.spec.ts.
 */
const PURDUE =
  "c=IN&cur=INR&s=243780&sn=Purdue+University-Main+Campus&sc=West+Lafayette&st=IN&sz=47907&t=28794&ts=school&y=2&sy=2027&ss=fall";
const NYU =
  "c=IN&cur=INR&s=193900&sn=New+York+University&sc=New+York&st=NY&sz=10012&t=65622&ts=school&y=2&sy=2027&ss=fall&ex=1";
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const serious = (v: { impact?: string | null }) =>
  v.impact === "serious" || v.impact === "critical";

test.describe("the shared page (DEMO_MODE)", () => {
  test("a shared link renders on the server and works without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`/r?${PURDUE}`);
    await expect(page.getByRole("heading", { name: "Your true cost" })).toBeVisible();
    await expect(
      page.getByText(/In 8 of 10 past periods, your degree would have cost between/),
    ).toBeVisible();
    await expect(page.getByText("The same range as a table")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit the inputs" })).toBeVisible();
    await ctx.close();
  });

  test("a broken shared link says so", async ({ page }) => {
    await page.goto("/r?c=IN");
    await expect(page.getByText("That link doesn't contain a valid estimate.")).toBeVisible();
  });

  test("the shared page passes axe with the full WCAG 2.2 tag set", async ({ page }) => {
    await page.goto(`/r?${NYU}`);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const shared = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(shared.violations.filter(serious), JSON.stringify(shared.violations, null, 2)).toEqual(
      [],
    );
  });

  test("every keyboard stop on the shared page shows a visible focus ring", async ({ page }) => {
    await page.goto(`/r?${NYU}`);
    await expect(page.getByText("Your degree: about", { exact: true })).toBeVisible();
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return {
          key: `${el.tagName}:${el.id || el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30)}`,
          focusVisible: el.matches(":focus-visible"),
          outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2,
        };
      });
      if (!stop) break;
      seen.add(stop.key);
      if (stop.focusVisible) expect(stop.outline, stop.key).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  test("no horizontal scroll at 320px, and the header links to the home page's form and method", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`/r?${NYU}`);
    await expect(page.getByText("Your degree: about", { exact: true })).toBeVisible();
    await page.getByText("The same range as a table").click();
    await page.evaluate(() => document.fonts.ready);
    const after = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(after[0]).toBeLessThanOrEqual(after[1] ?? 320);
    await expect(page.getByRole("contentinfo")).toContainText("Not a prediction");
    // On a result the header carries the result nav; the plain shell's links point home.
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/privacy");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Get my estimate" }),
    ).toHaveAttribute("href", "/#calc");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "How we work it out" }),
    ).toHaveAttribute("href", "/#how");
  });

  test("a shared comparison link renders on the server without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(
      `/r?${PURDUE}&s2=193900&sn2=New+York+University&sc2=New+York&st2=NY&sz2=10012&t2=65622&ts2=school`,
    );
    await expect(page.getByRole("heading", { name: "Side by side" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Total over the programme/ })).toBeVisible();
    await ctx.close();
  });

  test("the shared page offers the savings levers as links that work without JavaScript", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`/r?${PURDUE}`);
    await expect(page.getByRole("heading", { name: "Ways to lower this number" })).toBeVisible();
    await page.getByRole("link", { name: "Try it: One fewer trip home a year" }).click();
    await expect(page).toHaveURL(/lv=flights-fewer/);
    await expect(page.getByText(/down from/).first()).toBeVisible();
    await ctx.close();
  });
});

test.describe("the full calculation", () => {
  test("opens from a share link without JavaScript, carries the moved sections, prints cleanly and passes axe", async ({
    browser,
    page,
  }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await ctx.newPage();
    await noJs.goto(`/estimate/breakdown?${NYU}`);
    await expect(noJs.getByRole("heading", { name: "Your full calculation" })).toBeVisible();
    await expect(noJs.getByRole("heading", { name: "What you told us" })).toBeVisible();
    // Formula sentences come from the derivations: the tuition line names its term.
    await expect(noJs.getByText(/tuition a year/).first()).toBeVisible();
    await expect(noJs.getByText(/× 2 years over 2 years = \$/).first()).toBeVisible();
    await ctx.close();

    await page.goto(`/estimate/breakdown?${NYU}`);
    await expect(page.getByRole("heading", { name: "In plain English" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "When the money is needed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What if my currency moves?" })).toBeVisible();
    await expect(page.getByText("Reduce the uncertainty.")).toBeVisible();
    await expect(page.getByText("Visa Integrity Fee (may apply)").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the result" })).toHaveAttribute(
      "href",
      /^\/r\?/,
    );

    const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(axe.violations.filter(serious), JSON.stringify(axe.violations, null, 2)).toEqual([]);

    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("link", { name: "Report a mistake" })).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "How the exchange-rate range is made" }),
    ).toBeVisible();
  });

  test("the plain-English explanation starts as a template and can be replaced on request", async ({
    page,
  }) => {
    await page.goto(`/estimate/breakdown?${PURDUE}`);
    await expect(page.getByRole("heading", { name: "In plain English" })).toBeVisible();
    await expect(page.getByText("Standard wording from the numbers on this page.")).toBeVisible();
    await page.getByRole("button", { name: "Explain this result" }).click();
    await expect(page.getByText(/This is not a prediction/)).toBeVisible();
  });
});
