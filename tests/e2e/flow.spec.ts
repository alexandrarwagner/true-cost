import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function threeInputs(page: Page) {
  await page.goto("/");
  await page.getByLabel("I'm from").selectOption("IN");
  await page.getByLabel("My school").fill("purdue");
  await page.getByRole("button", { name: /Purdue University-Main Campus/ }).click();
  await expect(page.getByLabel("Tuition per year")).toHaveValue("28794");
  // Purdue's predominant degree pre-fills four years; two taps make it a master's.
  await expect(page.getByLabel("Years", { exact: true })).toHaveValue("4");
  await page.getByRole("button", { name: "Fewer years" }).click();
  await page.getByRole("button", { name: "Fewer years" }).click();
  await expect(page.getByLabel("Years", { exact: true })).toHaveValue("2");
}

test.describe("True Cost flow (DEMO_MODE)", () => {
  test("three inputs to a result, with the unfold, range, timeline and sources, and no serious a11y issues", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();

    await expect(page.getByRole("heading", { name: "Your true cost" })).toBeVisible();
    await expect(page.getByText(/Your degree could cost between/)).toBeVisible();
    await expect(page.getByText(/Hidden costs: \d+% on top of tuition/)).toBeVisible();
    await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it adds up" })).toBeVisible();
    await expect(page.getByRole("row", { name: /^Total/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What the exchange rate could do to this" }),
    ).toBeVisible();
    await expect(page.getByText("This isn't a prediction", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "When the money is needed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where each number comes from" })).toBeVisible();
    await expect(page.getByText("Visa Integrity Fee (may apply)").first()).toBeVisible();
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
    await expect(page.locator("summary", { hasText: /^Rent\b/ }).first()).toBeVisible();
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
    await expect(page.getByText(/Your degree could cost between/)).toBeVisible();
    await expect(page.getByText("The same range as a table")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit the inputs" })).toBeVisible();
    await ctx.close();
  });

  test("a broken shared link says so", async ({ page }) => {
    await page.goto("/r?c=IN");
    await expect(page.getByText("That link doesn't contain a valid estimate.")).toBeVisible();
  });

  test("the form is keyboard reachable and asks for the programme length", async ({ page }) => {
    await page.goto("/");
    // The skip link comes first; activating it jumps past the header to the form.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("I'm from")).toBeFocused();
    await page.getByLabel("My school").fill("purdue");
    await page.getByRole("button", { name: /Purdue University-Main Campus/ }).click();
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
    await expect(page.getByRole("heading", { name: "In plain English" })).toBeVisible();
    await expect(page.getByText("Standard wording from the numbers on this page.")).toBeVisible();
    await page.getByRole("button", { name: "Explain this result" }).click();
    await expect(page.getByText(/This is not a prediction/)).toBeVisible();
  });

  test("a smarter search resolves a nickname to a real school", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("My school").fill("nyu");
    await expect(page.getByText("No schools found. Try a different spelling.")).toBeVisible();
    await page.getByRole("button", { name: "Try a smarter search" }).click();
    await page.getByRole("button", { name: /New York University/ }).click();
    await expect(page.getByLabel(/Tuition per year/)).not.toHaveValue("");
  });
});

test.describe("motion and print", () => {
  test("with reduced motion the unfold rows are fully visible at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await threeInputs(page);
    await page.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("heading", { name: "How it adds up" })).toBeVisible();
    const opacities = await page.$$eval(".unfold-row", (rows) =>
      rows.map((r) => getComputedStyle(r).opacity),
    );
    expect(opacities.length).toBe(7);
    expect(opacities.every((o) => o === "1")).toBe(true);
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

test.describe("example mode", () => {
  test("shows sample figures with a persistent badge, keeps them on reload, and links them", async ({
    page,
  }) => {
    await page.goto("/");
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

test.describe("page shell", () => {
  test("no horizontal scroll at 320px, and the header links to the form and the methodology", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
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
  });
});

test.describe("Compare schools (COMPARE_ENABLED)", () => {
  test("a second school gives a side-by-side table, a comparison link and the first school's full result", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Add a school to compare" }).click();
    await page.getByLabel("School 2", { exact: true }).fill("new york");
    await page.getByRole("button", { name: /^New York University/ }).click();
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
    const total = page.getByText(/in total over the programme\./).first();
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
    await expect(page.getByText(/in total over the programme\./).first()).not.toHaveText(after);

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
    await expect(page.getByText("Reduce the uncertainty")).toBeVisible();
    await page.getByRole("link", { name: "Try it: One fewer trip home a year" }).click();
    await expect(page).toHaveURL(/lv=flights-fewer/);
    await expect(page.getByText(/down from/).first()).toBeVisible();
    await ctx.close();
  });
});
