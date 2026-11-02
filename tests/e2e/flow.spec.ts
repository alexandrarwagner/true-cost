import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function threeInputs(page: Page) {
  await page.goto("/react");
  await page.getByLabel("I'm from").selectOption("IN");
  await page.getByLabel("My school").fill("purdue");
  await page.getByRole("option", { name: /Purdue University-Main Campus/ }).click();
  await expect(page.getByLabel("Tuition per year")).toHaveValue("28794");
  // Purdue's predominant degree pre-fills four years; two taps make it a master's.
  await expect(page.getByLabel("Years", { exact: true })).toHaveValue("4");
  await page.getByRole("button", { name: "Fewer years" }).click();
  await page.getByRole("button", { name: "Fewer years" }).click();
  await expect(page.getByLabel("Years", { exact: true })).toHaveValue("2");
}

test.describe("Tuition+ flow (DEMO_MODE)", () => {
  test("three inputs to a result, with the tree, the nav and the range, and no serious a11y issues", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();

    await expect(page.getByRole("heading", { name: "Tuition is where it starts." })).toBeVisible();
    await expect(page.getByText("Your degree: about", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/In 8 of 10 past periods, your degree would have cost between/),
    ).toBeVisible();
    await expect(page.getByText(/Hidden costs: \d+% on top of tuition/)).toBeVisible();
    await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
    // The result nav takes over the header, with the section in view marked current.
    const nav = page.getByRole("navigation", { name: "Your result" });
    await page.evaluate(() => document.getElementById("breakdown")?.scrollIntoView());
    await expect(nav.getByRole("link", { name: "Breakdown" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(nav.getByRole("link", { name: "Exchange rate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "If the rupee moves." })).toBeVisible();
    await expect(page.getByText("This isn't a prediction", { exact: false }).first()).toBeVisible();
    // The sections the boards don't have are on the full calculation, not here.
    await expect(page.getByRole("heading", { name: "When the money is needed" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "In plain English" })).toHaveCount(0);
    await expect(page).toHaveURL(/\?c=IN&cur=INR&s=243780/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    // The unfold animates in; scan the settled page, not a half-faded one.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("the 'make it more accurate' path changes the model", async ({ page }) => {
    await threeInputs(page);
    await page.getByText("Make it more accurate").click();
    await page.getByLabel("Off campus").check();
    await page.getByLabel("Roommates sharing the rent").fill("1");
    await page.getByLabel("12-month lease (rent due over the summer)").check();
    await page.getByLabel(/Scholarship or assistantship/).fill("5000");
    await page.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("heading", { name: "Your true cost" })).toBeVisible();
    // The lines themselves are on the full calculation.
    await page
      .locator("#breakdown")
      .getByRole("link", { name: "See the full calculation" })
      .click();
    await expect(page.getByText(/^Rent\b/).first()).toBeVisible();
    await expect(page.getByText("Rent over the summer").first()).toBeVisible();
    await expect(page.getByText("Your scholarship has been taken off the tuition.")).toBeVisible();
    await expect(page.getByText(/What if my currency moves/)).toBeVisible();
  });

  test("a shared link renders on the server and works without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(
      "/r?c=IN&cur=INR&s=243780&sn=Purdue+University-Main+Campus&sc=West+Lafayette&st=IN&sz=47907&t=28794&ts=school&y=2&sy=2027&ss=fall",
    );
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

  test("the form is keyboard reachable and asks for the programme length", async ({ page }) => {
    await page.goto("/react");
    // The skip link comes first; activating it jumps past the header to the form.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("I'm from")).toBeFocused();
    await page.getByLabel("My school").fill("purdue");
    await page.getByRole("option", { name: /Purdue University-Main Campus/ }).click();
    await page.getByLabel("Tuition per year").fill("30000");
    // Years can no longer be empty, so test the school-required path.
    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("button", { name: "Show me" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Choose a school from the list." }),
    ).toBeVisible();
  });
});

test.describe("AI features (DEMO_MODE mock)", () => {
  // The AI routes allow 5 calls a minute per IP, which is right for production and too few
  // for parallel test workers sharing one address. Each test gets its own bucket.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.99.${process.pid % 250}.${n}` });
  });

  test("reading a pasted letter shows quoted figures and applies only the ticked ones", async ({
    page,
  }) => {
    await threeInputs(page);
    await page
      .getByLabel("Letter text")
      .fill(
        "Welcome to the 2-year MS program starting Fall 2027. Tuition is $30,500 per year and mandatory fees are $1,200. Estimated living expenses: $18,000. Scholarship: $5,000 per year.",
      );
    await page.getByRole("button", { name: "Read my letter" }).click();
    await expect(page.getByRole("heading", { name: "Here's what the letter says" })).toBeVisible();
    await expect(page.getByText("From the letter:").first()).toBeVisible();
    await page.getByRole("button", { name: "Use the ticked figures" }).click();
    await expect(page.getByRole("spinbutton", { name: "Tuition per year" })).toHaveValue("31700");
    await expect(page.getByLabel(/Scholarship or assistantship/)).toHaveValue("5000");
    await expect(page.getByLabel("Years", { exact: true })).toHaveValue("2");
    await page.getByText("Make it more accurate").click();
    await expect(page.getByLabel("Start term")).toHaveValue("2027-fall");
  });

  test("the plain-English explanation starts as a template and can be replaced on request", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    await page
      .locator("#breakdown")
      .getByRole("link", { name: "See the full calculation" })
      .click();
    await expect(page.getByRole("heading", { name: "In plain English" })).toBeVisible();
    await expect(page.getByText("Standard wording from the numbers on this page.")).toBeVisible();
    await page.getByRole("button", { name: "Explain this result" }).click();
    await expect(page.getByText(/This is not a prediction/)).toBeVisible();
  });

  test("a smarter search resolves a nickname to a real school", async ({ page }) => {
    await page.goto("/react");
    await page.getByLabel("My school").fill("nyu");
    await expect(page.getByText("No schools found. Try a different spelling.")).toBeVisible();
    await page.getByRole("button", { name: "Try a smarter search" }).click();
    await page.getByRole("option", { name: /New York University/ }).click();
    await expect(page.getByLabel(/Tuition per year/)).not.toHaveValue("");
  });
});

test.describe("motion and print", () => {
  test("with reduced motion the unfold rows are fully visible at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("heading", { name: "Tuition is where it starts." })).toBeVisible();
    const opacities = await page.$$eval(".tree-stage", (rows) =>
      rows.map((r) => getComputedStyle(r).opacity),
    );
    // Tuition, two lines, five cost cards, the total.
    expect(opacities.length).toBe(9);
    expect(opacities.every((o) => o === "1")).toBe(true);
    // Reduced motion also means the status line and the total show their final text at once.
    await expect(page.getByRole("status").filter({ hasText: /^Your degree: about/ })).toBeVisible();
  });

  test("the chart's table alternative carries the same columns for screen readers and print", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    await page.getByText("The same range as a table").click();
    await expect(page.getByRole("columnheader", { name: "At today's rate" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Worst 10% of past periods" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: /Chart of the cumulative cost/ })).toBeVisible();
  });
});

test.describe("where the money goes and the deals grid", () => {
  // Own rate-limit bucket: the suite as a whole sits near the general tier's 30 calls a minute.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.95.${process.pid % 250}.${n}` });
  });

  test("the shares list toggles to labelled circles, and deals filter by category", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    const shares = page.locator("#where");
    await expect(shares.getByRole("heading", { name: "Where the money goes." })).toBeVisible();
    // Circles by default, with a text description; the list is the accessible alternative.
    await expect(
      shares.getByRole("img", { name: /Shares of the total: Tuition \d+%/ }),
    ).toBeVisible();
    await shares.getByRole("button", { name: "See as list" }).click();
    await expect(shares.getByText(/% of the total/).first()).toBeVisible();
    await expect(shares.getByRole("button", { name: "See as chart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Deals sit in their own grid, with the check date and the source opening in a new tab.
    const deals = page.locator("#save");
    await expect(deals.getByRole("heading", { name: "Student deals" })).toBeVisible();
    await expect(deals.getByText(/^Checked \w+ 2026 · No paid listings$/)).toBeVisible();
    await expect(
      deals.getByRole("link", { name: /Source \(opens in a new tab\)/ }).first(),
    ).toHaveAttribute("target", "_blank");
    await expect(
      page.getByRole("switch", { name: "Try it: Spotify Premium Student" }),
    ).toBeVisible();
  });

  test("the school field is a combobox that works from the keyboard", async ({ page }) => {
    await page.goto("/react");
    const box = page.getByRole("combobox", { name: "My school" });
    await box.fill("purdue");
    await expect(page.getByRole("option", { name: /Purdue University-Main Campus/ })).toBeVisible();
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(
      page.locator("#estimate").getByText("Purdue University-Main Campus"),
    ).toBeVisible();
    await expect(page.getByLabel("Tuition per year")).toHaveValue("28794");
  });
});

test.describe("Know a cost we missed?", () => {
  // Three estimate calls per test; keep them out of the shared rate-limit bucket.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.97.${process.pid % 250}.${n}` });
  });

  test("an added cost joins the total and the share link, and can be removed", async ({ page }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    // The dollar figure under the big total: "₹… · $…".
    const usdTotal = page
      .locator("#breakdown")
      .getByText(/· \$[\d,]+$/)
      .first();
    const before = (await usdTotal.textContent()) ?? "";
    await page.getByLabel("What is it").fill("Laptop");
    await page.getByLabel("Amount").fill("1200");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("list", { name: "Costs you added" })).toContainText(
      "Laptop: $1,200",
    );
    await expect(usdTotal).not.toHaveText(before);
    const dollars = (s: string) => Number((s.match(/\$([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""));
    // The laptop plus the transfer costs of sending $1,200 from home: a true re-run, not a sum.
    const after = dollars((await usdTotal.textContent()) ?? "");
    expect(after).toBeGreaterThanOrEqual(dollars(before) + 1200);
    expect(after).toBeLessThan(dollars(before) + 1300);
    await expect(page).toHaveURL(/customCosts/);
    await page.getByRole("button", { name: "Remove Laptop" }).click();
    await expect(usdTotal).toHaveText(before);
  });
});

test.describe("example mode", () => {
  test("shows sample figures with a persistent badge, keeps them on reload, and links them", async ({
    page,
  }) => {
    await page.goto("/react");
    await expect(
      page.getByRole("heading", { name: "Your estimate will appear here." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "or see an example first" }).click();
    await expect(page.getByRole("heading", { name: "Your true cost" })).toBeVisible();
    await expect(page.getByText("Sample figures", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/ex=1/);
    // The chosen school shows as text with a "Change" button, not as an input.
    await expect(page.locator("#estimate").getByText("New York University")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Sample figures", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your estimate will appear here." }),
    ).toHaveCount(0);
  });
});

test.describe("the full calculation", () => {
  const share =
    "c=IN&cur=INR&s=193900&sn=New+York+University&sc=New+York&st=NY&sz=10012&t=65622&ts=school&y=2&sy=2027&ss=fall&ex=1";

  test("opens from a share link without JavaScript, matches the result's subtotals, prints cleanly and passes axe", async ({
    browser,
    page,
  }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await ctx.newPage();
    await noJs.goto(`/estimate/breakdown?${share}`);
    await expect(noJs.getByRole("heading", { name: "Your full calculation" })).toBeVisible();
    await expect(noJs.getByRole("heading", { name: "What you told us" })).toBeVisible();
    // Formula sentences come from the derivations: the tuition line names its term.
    await expect(noJs.getByText(/tuition a year/).first()).toBeVisible();
    await expect(noJs.getByText(/× 2 years over 2 years = \$/).first()).toBeVisible();
    await ctx.close();

    // The result page's figures link to the page, and each category subtotal matches.
    await page.goto(`/react?${share}`);
    const tree = page.locator("#breakdown");
    const housingOnResult =
      (await tree.getByRole("link", { name: /^₹/ }).nth(1).textContent()) ?? "";
    await tree.getByRole("link", { name: "See the full calculation" }).click();
    await expect(page).toHaveURL(/\/estimate\/breakdown\?/);
    const housingHeading = page.locator("#housing-heading");
    await expect(housingHeading).toContainText(housingOnResult.trim());
    // The sections that moved here from the result page.
    await expect(page.getByRole("heading", { name: "In plain English" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "When the money is needed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What if my currency moves?" })).toBeVisible();
    await expect(page.getByText("Reduce the uncertainty.")).toBeVisible();
    await expect(page.getByText("Visa Integrity Fee (may apply)").first()).toBeVisible();

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("link", { name: "Report a mistake" })).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "How the exchange-rate range is made" }),
    ).toBeVisible();
  });
});

test.describe("accessibility across pages", () => {
  const share =
    "c=IN&cur=INR&s=193900&sn=New+York+University&sc=New+York&st=NY&sz=10012&t=65622&ts=school&y=2&sy=2027&ss=fall&ex=1";
  const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
  const serious = (v: { impact?: string | null }) =>
    v.impact === "serious" || v.impact === "critical";

  test("the empty home page and the shared page pass axe with the full WCAG 2.2 tag set", async ({
    page,
  }) => {
    await page.goto("/react");
    const home = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(home.violations.filter(serious), JSON.stringify(home.violations, null, 2)).toEqual([]);
    await page.goto(`/r?${share}`);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const shared = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(shared.violations.filter(serious), JSON.stringify(shared.violations, null, 2)).toEqual(
      [],
    );
  });

  test("every keyboard stop on the result page shows a visible focus ring", async ({ page }) => {
    await page.goto(`/react?${share}`);
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
});

test.describe("page shell", () => {
  test("no horizontal scroll at 320px, and the header links to the form and the methodology", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/react");
    const widths = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1] ?? 320);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Get my estimate" }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("Not a prediction");
    await page.getByRole("banner").getByRole("link", { name: "Get my estimate" }).click();
    await expect(page).toHaveURL(/#estimate$/);
    // The methodology table is always on the page, generated from the source registry. Its
    // header link shows from the sm breakpoint up; phones reach it through the result nav.
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.getByRole("banner").getByRole("link", { name: "How we work it out" }).click();
    await expect(page).toHaveURL(/#how$/);
    await expect(page.getByRole("heading", { name: "How we work it out." })).toBeVisible();
    await expect(page.getByRole("row", { name: /Exchange rate.*Frankfurter/ })).toBeVisible();
    // The result page, with its nav, tree and tables, must reflow at 320px too (WCAG 1.4.10).
    await page.goto(
      "/react?c=IN&cur=INR&s=193900&sn=New+York+University&sc=New+York&st=NY&sz=10012&t=65622&ts=school&y=2&sy=2027&ss=fall&ex=1",
    );
    await expect(page.getByText("Your degree: about", { exact: true })).toBeVisible();
    await page.getByText("The same range as a table").click();
    await page.evaluate(() => document.fonts.ready);
    const after = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(after[0]).toBeLessThanOrEqual(after[1] ?? 320);
  });
});

test.describe("Compare schools (COMPARE_ENABLED)", () => {
  // Own rate-limit bucket: the suite as a whole sits near the general tier's 30 calls a minute.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.96.${process.pid % 250}.${n}` });
  });

  test("a second school gives a side-by-side table, a comparison link and the first school's full result", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Add a school to compare" }).click();
    await page.getByLabel("School 2", { exact: true }).fill("new york");
    await page.getByRole("option", { name: /^New York University/ }).click();
    await expect(page.getByLabel(/Tuition per year at school 2/)).toHaveValue("65622");
    await page.getByRole("button", { name: "Show me" }).click();

    await expect(page.getByRole("heading", { name: "Side by side" })).toBeVisible();
    const table = page.getByRole("table").first();
    await expect(table.getByRole("link", { name: "Purdue University-Main Campus" })).toBeVisible();
    await expect(table.getByRole("link", { name: "New York University" })).toBeVisible();
    await expect(table.getByText("Lowest", { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Full breakdown for Purdue University-Main Campus" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/s2=193900/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("a shared comparison link renders on the server without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(
      "/r?c=IN&cur=INR&s=243780&sn=Purdue+University-Main+Campus&sc=West+Lafayette&st=IN&sz=47907&t=28794&ts=school&y=2&sy=2027&ss=fall&s2=193900&sn2=New+York+University&sc2=New+York&st2=NY&sz2=10012&t2=65622&ts2=school",
    );
    await expect(page.getByRole("heading", { name: "Side by side" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Total over the programme/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit the inputs" })).toHaveAttribute(
      "href",
      /s2=193900/,
    );
    await ctx.close();
  });
});

test.describe("Ways to lower this number (SAVINGS_ENABLED follows DEMO_MODE)", () => {
  // Each toggle is another estimate call. With every test sharing one address, the suite sits
  // right at the general tier's 30 a minute, so these tests get their own bucket.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.98.${process.pid % 250}.${n}` });
  });

  test("two levers switched on drop the total, update the URL, survive a reload, and pass axe", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByText("Make it more accurate").click();
    await page.getByLabel("Off campus").check();
    await page.getByLabel("12-month lease (rent due over the summer)").check();
    await page.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("heading", { name: "Ways to lower this number" })).toBeVisible();
    const total = page
      .locator("#breakdown")
      .getByText(/· \$[\d,]+$/)
      .first();
    const before = (await total.textContent()) ?? "";

    await page.getByRole("switch", { name: "Try it: Share with two roommates" }).check();
    await expect(page.getByRole("status").filter({ hasText: /down from/ })).toBeVisible();
    await expect(page).toHaveURL(/lv=roommates-2/);
    await page.getByRole("switch", { name: "Try it: Skip rent over the summer" }).check();
    await expect(page).toHaveURL(/lv=roommates-2%2Clease-12-vs-9/);
    const after = (await total.textContent()) ?? "";
    const dollars = (s: string) => Number((s.match(/\$([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""));
    expect(dollars(after)).toBeLessThan(dollars(before));
    await expect(page.getByRole("switch", { name: "Try it: Live on campus" })).toBeDisabled();

    // A national student deal ranks in the same list (here behind "Show more", since its figure
    // is small), with its provenance, and toggles too.
    const showMore = page.getByText(/^Show \d+ more$/);
    await showMore.click();
    const deal = page.getByRole("switch", { name: "Try it: Spotify Premium Student" });
    await expect(page.getByText("Checked on Oct 31, 2026").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "This deal ended" }).first()).toHaveAttribute(
      "href",
      /spotify-premium-student/,
    );
    await deal.check();
    await expect(page).toHaveURL(/deal%3Aspotify-premium-student/);

    await page.reload();
    await showMore.click();
    await expect(deal).toBeChecked();
    await expect(
      page.getByRole("switch", { name: "Try it: Share with two roommates" }),
    ).toBeChecked();
    await expect(
      page.getByRole("switch", { name: "Try it: Skip rent over the summer" }),
    ).toBeChecked();
    await expect(total).not.toHaveText(after);

    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("the shared page offers the levers as links that work without JavaScript", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(
      "/r?c=IN&cur=INR&s=243780&sn=Purdue+University-Main+Campus&sc=West+Lafayette&st=IN&sz=47907&t=28794&ts=school&y=2&sy=2027&ss=fall",
    );
    await expect(page.getByRole("heading", { name: "Ways to lower this number" })).toBeVisible();
    await page.getByRole("link", { name: "Try it: One fewer trip home a year" }).click();
    await expect(page).toHaveURL(/lv=flights-fewer/);
    await expect(page.getByText(/down from/).first()).toBeVisible();
    await ctx.close();
  });
});
