import { defineConfig, devices } from "@playwright/test";

// End-to-end tests of the review UI against the real server in mock-model mode (no API calls).
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1400, height: 1000 },
    baseURL: "http://localhost:5174",
  },
  webServer: [
    {
      command: "pnpm --filter @curb/server exec tsx --tsconfig ../../tsconfig.json src/index.ts",
      url: "http://127.0.0.1:3101/health",
      env: { CURB_MODEL: "mock", CURB_SERVER_PORT: "3101" },
      reuseExistingServer: false,
    },
    {
      command: "pnpm --filter @curb/web exec vite --port 5174 --strictPort",
      url: "http://localhost:5174",
      env: { CURB_API_URL: "http://127.0.0.1:3101" },
      reuseExistingServer: false,
    },
  ],
});
