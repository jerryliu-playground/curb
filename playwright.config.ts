import { defineConfig, devices } from "@playwright/test";
import { SLIDE_VIEWPORT } from "@curb/renderer";

export default defineConfig({
  testDir: "./tests/render",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: SLIDE_VIEWPORT,
    deviceScaleFactor: 1,
  },
});
