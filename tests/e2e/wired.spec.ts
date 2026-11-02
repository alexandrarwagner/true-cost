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
