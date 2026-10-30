import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages}/*/{src,test}/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    passWithNoTests: false,
  },
});
