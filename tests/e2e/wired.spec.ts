import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * The designer's page with the real data behind it. Step 4: the school field searches
 * College Scorecard through this site's route; a pick carries the school's UNITID and fills
 * the bar from its published tuition.
 */
test.describe("the designer's page: school search", () => {
  test.skip(({ isMobile }) => isMobile, "desktop width only; the mockup is desktop-only");
  // Own rate-limit bucket per test: the suite as a whole sits near the general tier's 30 calls a minute.
  let n = 0;
  test.beforeEach(async ({ context }) => {
    n++;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.94.${process.pid % 250}.${n}` });
  });
  test.use({ viewport: { width: 1440, height: 900 } });

  test("typing a school shows matches from the route; picking one fills the tuition", async ({
    page,
  }) => {
    await page.goto("/");
    const school = page.locator("#school");
    await school.fill("purdue");
    const option = page.getByRole("option", { name: /Purdue University-Main Campus/ });
    await expect(option).toBeVisible();
    await expect(option).toContainText("West Lafayette, IN");
    await option.click();
    await expect(school).toHaveValue("Purdue University-Main Campus");
    await expect(page.locator("#tuition")).not.toHaveValue("");
    const picked = await page.evaluate(
      () => (window as unknown as { TPSchool: { unitId: number; zip: string } }).TPSchool,
    );
    expect(picked.unitId).toBe(243780);
    expect(picked.zip).toMatch(/^\d{5}/);
    expect(
      await page.evaluate(() => (window as unknown as { TPTuitionSource: string }).TPTuitionSource),
    ).toBe("school");

    // Typing over the tuition makes it the student's own number again.
    await page.locator("#tuition").fill("$40,000");
    expect(
      await page.evaluate(() => (window as unknown as { TPTuitionSource: string }).TPTuitionSource),
    ).toBe("user");
  });

  test("a nickname finds the school, and the keyboard picks it", async ({ page }) => {
    await page.goto("/");
    const school = page.locator("#school");
    await school.fill("nyu");
    await expect(page.getByRole("option", { name: /New York University/ })).toBeVisible();
    await school.press("Enter");
    await expect(school).toHaveValue("New York University");
    // NYU's predominant degree in the data is a bachelor's, so four years.
    await expect(page.locator("#years")).toHaveValue("4");
  });

  test("Show me with a picked school runs the real engine: sourced figures, the real rate", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#school").fill("purdue");
    await page.getByRole("option", { name: /Purdue University-Main Campus/ }).click();
    await page.locator("#years").fill("2");
    await page.locator("#calc button[type=submit]").click();
    // The markup carries sample figures, so wait for the reveal itself to finish (window.TP).
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    const tp = await page.evaluate(
      () =>
        (
          window as unknown as {
            TP: { c: { tui: number; house: number }; tot: number; CUR: string };
          }
        ).TP,
    );
    expect(tp.CUR).toBe("INR");
    expect(tp.c.tui).toBe(28_794 * 2);
    expect(tp.c.house).toBeGreaterThan(0);
    expect(tp.tot).toBeGreaterThan(tp.c.tui);
    // The engine says where its figures came from (demo fixtures here), card by card.
    await expect(page.locator("#r-sample")).toContainText("Sample rent and living costs");
    await expect(page.locator("#results .land.l1")).toContainText("From your school · 24 months");
    await expect(page.locator("#results .land.l2")).toContainText(
      /From your school|Our estimate|Government data/,
    );
    await expect(page.locator("#results .land.l4")).toContainText("Our estimate · bank fees");
    // Adding a cost re-runs the engine, not the page's own arithmetic. In v2 the form sits in
    // the "Make this number more accurate" panel, opened by its toggle.
    await page.locator("#refine-toggle").click();
    await expect(page.locator("#refine-panel")).toHaveClass(/open/);
    await page.locator("#add-cost-form input[name=n]").fill("Laptop");
    await page.locator("#add-cost-form input[name=a]").fill("1200");
    await page.locator("#add-cost-form button[type=submit]").click();
    await page.waitForFunction(
      (t) => (window as unknown as { TP: { tot: number } }).TP.tot > t,
      tp.tot,
    );
    const after = await page.evaluate(() => (window as unknown as { TP: { tot: number } }).TP.tot);
    expect(after).toBeGreaterThan(tp.tot + 1200);
  });

  test("the example is a real school: New York University at its published tuition", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(page.locator("#school")).toHaveValue("New York University");
    await expect(page.locator("#tuition")).toHaveValue("$65,622");
    await expect(page.locator("#r-sample")).toContainText("$65,622 a year for 2 years");
  });

  test("another currency shows in its own symbol and grouping, in the total and the chart", async ({
    page,
  }) => {
    await page.goto("/");
    const from = page.locator("#from");
    await from.fill("South Korea");
    await page.getByRole("option", { name: /South Korea/ }).click();
    await expect(page.locator("#cur")).toHaveText("KRW ₩");
    await page.locator("#school").fill("Boston University");
    await page.locator("#tuition").fill("$30,000");
    await page.locator("#years").fill("2");
    await page.locator("#calc button[type=submit]").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(page.locator("#r-total")).toContainText("₩");
    await expect(page.locator("#r-tui")).toHaveText(/^₩[\d,]+$/);
    await expect(page.locator("#rb1")).toContainText("₩");
    await expect(page.locator("#fx-fan svg")).toContainText("₩ million");
    await expect(page.locator("#r-total-sub")).toContainText("₩");
    await expect(page.locator("#r-total-sub")).toContainText("$");
    await expect(page.locator("#fx h2")).toHaveText("If the won moves.");
  });

  test("a currency without rate history keeps the figures and says the range is not available", async ({
    page,
  }) => {
    // Every listed currency has history now, so stand in for a gap in Frankfurter's data.
    await page.route("**/api/fx/history**", (route) =>
      route.fulfill({ json: { today: null, history: [] } }),
    );
    await page.goto("/");
    const from = page.locator("#from");
    await from.fill("Germany");
    await page.getByRole("option", { name: /Germany/ }).click();
    await expect(page.locator("#cur")).toHaveText("EUR €");
    await page.locator("#school").fill("Boston University");
    await page.locator("#tuition").fill("$30,000");
    await page.locator("#years").fill("2");
    await page.locator("#calc button[type=submit]").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(page.locator("#fx .fx-none")).toContainText("enough rate history for EUR");
    await expect(page.locator("#fx-fan")).toBeHidden();
    await expect(page.locator("#fx h2")).toBeVisible();
  });

  test("the deals are the approved ones for the school, with working filter chips", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    const grid = page.locator("#deals");
    await expect(grid.locator(".deal")).toHaveCount(2);
    await expect(grid).toContainText("Spotify Premium Student");
    await expect(grid).toContainText("Free entry to New York museums");
    await expect(grid).toContainText("checked Oct 2026");
    await expect(page.locator("#deals-checked")).toHaveText("Checked Oct 2026 · No paid listings");
    await expect(page.locator("#save-city")).toHaveText("New York");
    // No generic tips, no Boston cards.
    await expect(page.getByText("General tips")).toHaveCount(0);
    await expect(page.getByText("Orangetheory")).toHaveCount(0);
    // The "Check before you go" line is gone (decision 19).
    await expect(page.locator("#save")).not.toContainText("Check before you go");
    await expect(page.locator("#save")).not.toContainText("Tips are examples");
    // The chips filter the cards.
    await page.locator("#deal-chips .dchip", { hasText: "Museums and culture" }).click();
    await expect(grid.locator(".deal:visible")).toHaveCount(1);
    await page.locator("#deal-chips .dchip", { hasText: "All" }).click();
    await expect(grid.locator(".deal:visible")).toHaveCount(2);
    // The copy fixes.
    await expect(page.locator("#fx")).toContainText(
      "Frankfurter (European Central Bank reference rates)",
    );
    await expect(page.locator("#sources")).toContainText("College Scorecard");
    await expect(page.locator("#sources")).not.toContainText("FRED");
    await expect(page.locator("#add-cost-form input[name=n]")).toHaveAttribute(
      "placeholder",
      "e.g. Laptop, winter coat",
    );
  });

  test("the PDF library loads only when Download PDF is pressed, and a PDF is produced", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    expect(await page.evaluate(() => typeof (window as { html2pdf?: unknown }).html2pdf)).toBe(
      "undefined",
    );
    const download = page.waitForEvent("download", { timeout: 60_000 });
    await page.locator("#pdf-btn").click();
    expect((await download).suggestedFilename()).toBe("tuition-plus-full-cost.pdf");
    expect(await page.evaluate(() => typeof (window as { html2pdf?: unknown }).html2pdf)).toBe(
      "function",
    );
  });

  test("each cost card links to its rows on the full calculation", async ({ page }) => {
    await page.goto("/");
    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    // The line under "How we work it out" names the full calculation (decision 18).
    const full = page.locator("#full-calc");
    await expect(full).toBeVisible();
    await expect(full).toHaveAttribute("href", /^\/estimate\/breakdown\?/);
    const link = page.locator("#r-house a");
    await expect(link).toHaveAttribute("href", /^\/estimate\/breakdown\?.*#housing$/, {
      timeout: 10_000,
    });
    const figure = (await link.textContent())?.trim() ?? "";
    await link.click();
    await expect(page).toHaveURL(/\/estimate\/breakdown\?/);
    await expect(page.getByRole("heading", { name: "Your full calculation" })).toBeVisible();
    await expect(page.locator("#housing-heading")).toContainText(figure);
  });

  test("passes axe with no violations, before and after Show me", async ({ page }) => {
    const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
    await page.goto("/");
    // axe scans a settled page: the opening sequence fades the hero words in from 25%.
    await page.waitForFunction(() => !document.documentElement.classList.contains("intro"));
    const before = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(before.violations, JSON.stringify(before.violations, null, 2)).toEqual([]);
    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    // The page keeps a few looping animations (the sheet's tilt), so wait for the reveal's own
    // "done" mark rather than for every animation to finish.
    await expect(page.locator("#r-status.ok")).toBeVisible({ timeout: 10_000 });
    const after = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(after.violations, JSON.stringify(after.violations, null, 2)).toEqual([]);
  });

  test("a shared link with edit=1 fills the bar and runs; without it the shared page opens", async ({
    page,
  }) => {
    const share =
      "c=IN&cur=INR&s=243780&sn=Purdue+University-Main+Campus&sc=West+Lafayette&st=IN&sz=47907&t=28794&ts=school&y=2&sy=2027&ss=fall";
    await page.goto(`/?${share}&edit=1`);
    await expect(page.locator("#from")).toHaveValue("India");
    await expect(page.locator("#cur")).toHaveText("INR ₹");
    await expect(page.locator("#school")).toHaveValue("Purdue University-Main Campus");
    await expect(page.locator("#tuition")).toHaveValue("$28,794");
    await expect(page.locator("#years")).toHaveValue("2");
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    const tp = await page.evaluate(
      () => (window as unknown as { TP: { c: { tui: number }; Y: number } }).TP,
    );
    expect(tp.c.tui).toBe(28_794 * 2);
    expect(tp.Y).toBe(2);
    await page.goto(`/?${share}`);
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/r\?c=IN/);
  });

  test("the full-calculation link is hidden until there is a result", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#full-calc")).toBeHidden();
  });

  test("the empty state shows until Show me, and the sticky nav switches to the result links", async ({
    page,
  }) => {
    await page.goto("/");
    const empty = page.locator("#empty");
    await expect(empty).toBeVisible();
    await expect(
      empty.getByRole("heading", { name: "Your estimate will appear here." }),
    ).toBeVisible();
    const nav = page.locator("#topnav");
    await expect(nav).toHaveCSS("position", "sticky");
    await expect(nav.getByRole("link", { name: "Get my estimate" })).toBeVisible();
    await expect(nav.locator(".nav-post a[data-sec]").first()).toBeHidden();
    // "Enter my details" scrolls back to the bar and focuses the first field.
    await empty.getByRole("link", { name: "Enter my details" }).click();
    await expect(page.locator("#from")).toBeFocused();

    await page.locator("#example").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(empty).toBeHidden();
    await expect(nav.getByRole("link", { name: "Get my estimate" })).toBeHidden();
    await expect(nav.locator("#nb-total")).toContainText("₹");
    await expect(nav.locator('.nav-post a[data-sec="results"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
    await nav.locator('.nav-post a[data-sec="where"]').click();
    await expect(nav.locator('.nav-post a[data-sec="where"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("the United Kingdom works in pounds, with the chart and the heading", async ({ page }) => {
    await page.goto("/");
    await page.locator("#from").fill("United Kingdom");
    await page.getByRole("option", { name: /United Kingdom/ }).click();
    await expect(page.locator("#cur")).toHaveText("GBP £");
    await expect(page.locator("#calc-err")).toHaveText("");
    await page.locator("#school").fill("Boston University");
    await page.locator("#tuition").fill("$30,000");
    await page.locator("#years").fill("2");
    await page.locator("#calc button[type=submit]").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(page.locator("#r-tui")).toHaveText(/^£[\d,]+$/);
    await expect(page.locator("#fx h2")).toHaveText("If the pound moves.");
    await expect(page.locator("#fx-fan svg")).toContainText("£ thousand");
  });

  test("a currency the engine cannot calculate in is an error at input, not dollars by surprise", async ({
    page,
  }) => {
    await page.goto("/");
    // No country in the list is unsupported any more, so stand in for one through the chip.
    await page.evaluate(() => {
      const chip = document.getElementById("cur");
      if (chip) chip.textContent = "XXX";
    });
    await page.locator("#school").fill("Boston University");
    await page.locator("#tuition").fill("$30,000");
    await page.locator("#calc button[type=submit]").click();
    await expect(page.locator("#calc-err")).toContainText("We can’t work it out in XXX yet");
    await expect(page.locator("#from")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#from")).toBeFocused();
    expect(await page.evaluate(() => "TP" in window)).toBe(false);
  });

  test("?engine=prototype brings the prototype's numbers back for the pixel tests", async ({
    page,
  }) => {
    await page.goto("/?engine=prototype");
    const version = await page.evaluate(
      () => (window as unknown as { TPEngine: { version: string } }).TPEngine.version,
    );
    expect(version).toBe("prototype-1");
    await page.goto("/");
    const real = await page.evaluate(
      () => (window as unknown as { TPEngine: { version: string } }).TPEngine.version,
    );
    expect(real).toMatch(/^engine-/);
  });

  test("the page still runs its own scripts, now as files, with no inline script", async ({
    page,
  }) => {
    const res = await page.goto("/");
    const html = (await res?.text()) ?? "";
    expect(html.match(/<script(?![^>]*\ssrc=)[^>]*>/g) ?? []).toEqual([]);
    // Each script address carries its file's version, so a cached script never outlives a deploy.
    expect(html).toMatch(/src="\/wired\/ui-and-animation\.js\?v=[0-9a-f]{8}"/);
    expect(html).toMatch(/src="\/engine\.js\?v=[0-9a-f]{8}"/);
    await page.locator("#example").click();
    await expect(page.locator("#r-total")).not.toHaveText("");
  });
});
