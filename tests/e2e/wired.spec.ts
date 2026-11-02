import { expect, test } from "@playwright/test";

/*
 * The designer's page with the real data behind it. Step 4: the school field searches
 * College Scorecard through this site's route; a pick carries the school's UNITID and fills
 * the bar from its published tuition.
 */
test.describe("the designer's page: school search", () => {
  test.skip(({ isMobile }) => isMobile, "desktop width only; the mockup is desktop-only");
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
    // The engine says where its figures came from (demo fixtures here).
    await expect(page.locator("#r-sample")).toContainText("Sample rent and living costs");
    // Adding a cost re-runs the engine, not the page's own arithmetic.
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
  });

  test("a currency without rate history keeps the figures and says the range is not available", async ({
    page,
  }) => {
    await page.goto("/");
    const from = page.locator("#from");
    await from.fill("Germany");
    await page.getByRole("option", { name: /Germany/ }).click();
    await expect(page.locator("#cur")).toHaveText("EUR €");
    await page.locator("#tuition").fill("$30,000");
    await page.locator("#years").fill("2");
    await page.locator("#calc button[type=submit]").click();
    await page.waitForFunction(() => "TP" in window, null, { timeout: 10_000 });
    await expect(page.locator("#fx .fx-none")).toContainText("enough rate history for EUR");
    await expect(page.locator("#fx-fan")).toBeHidden();
    await expect(page.locator("#fx h2")).toBeVisible();
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
    expect(html).toContain('src="/wired/ui-and-animation.js"');
    await page.locator("#example").click();
    await expect(page.locator("#r-total")).not.toHaveText("");
  });
});
