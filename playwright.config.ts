import { defineConfig, devices } from "@playwright/test";

const port = 3000;

export default defineConfig({
  testDir: "tests/e2e",
  // Baselines for the pixel comparison (design.spec.ts), captured from the served page per platform.
  snapshotPathTemplate: "design/reference/screens-served/{platform}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testIgnore: /design-v2/ },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /design-v2/ },
    {
      // The designer's v2 kit: screens and animation frames compared as delivered.
      name: "design-v2",
      testMatch: /design-v2/,
      use: { ...devices["Desktop Chrome"] },
      snapshotPathTemplate: "design/reference-v2/{arg}{ext}",
    },
  ],
  webServer: {
    // e2e always runs the production build in DEMO_MODE with no real keys.
    command: "npm run start",
    port,
    reuseExistingServer: !process.env.CI,
    env: { DEMO_MODE: "true", COMPARE_ENABLED: "true", NODE_ENV: "production" },
  },
});
