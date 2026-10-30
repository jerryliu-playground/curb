import { defineConfig, devices } from "@playwright/test";
import { SLIDE_VIEWPORT } from "./src/index.ts";

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: SLIDE_VIEWPORT,
    deviceScaleFactor: 1,
  },
});
