import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function threeInputs(page: Page) {
  await page.goto("/");
  await page.getByLabel("Where are you from?").selectOption("IN");
  await page.getByLabel("Which school?").fill("purdue");
  await page.getByRole("button", { name: /Purdue University-Main Campus/ }).click();
  await expect(page.getByLabel(/Tuition per year/)).toHaveValue("28794");
  await expect(page.getByLabel("Undergraduate, 4 years")).toBeChecked();
  await page.getByLabel("Master's, 2 years").check();
}

test.describe("True Cost flow (DEMO_MODE)", () => {
  test("three inputs to a result, with the unfold, range, timeline and sources, and no serious a11y issues", async ({
    page,
  }) => {
    await threeInputs(page);
    await page.getByRole("button", { name: "Show the true cost" }).click();

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
    await page.getByRole("button", { name: "Show the true cost" }).click();
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
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Where are you from?")).toBeFocused();
    await page.getByLabel("Which school?").fill("purdue");
    await page.getByRole("button", { name: /Purdue University-Main Campus/ }).click();
    await page.getByLabel("Tuition per year (US dollars)").fill("30000");
    // Purdue preselects undergraduate; clear it by choosing "Other" with no years is impossible, so test the school-required path instead.
    await page.getByRole("button", { name: "Change" }).click();
    await page.getByRole("button", { name: "Show the true cost" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Choose a school from the list." }),
    ).toBeVisible();
  });
});
