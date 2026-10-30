// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Boundary rules from CLAUDE.md. Each message names the rule it enforces and what to do instead,
 * so a failing lint is enough to fix the problem without reading the config.
 */
const MODEL_SDK = {
  group: ["@anthropic-ai/*"],
  message:
    "CLAUDE.md rule 4/5: the model SDK is only used in apps/server (and the CLI). Depend on the ModelClient interface from @curb/pipeline instead.",
};

const NODE_IO = {
  group: [
    "node:*",
    "fs",
    "fs/*",
    "path",
    "child_process",
    "http",
    "https",
    "net",
    "os",
    "playwright",
    "@playwright/*",
  ],
  message:
    "CLAUDE.md rule 6: templates are pure. No file, network or browser I/O here; pass data in as props.",
};

const NON_TEMPLATE_WORKSPACE = {
  group: ["@curb/pipeline", "@curb/renderer", "@curb/server", "@curb/web"],
  message:
    "CLAUDE.md rule 6: templates contain no pipeline or rendering logic and may only depend on @curb/shared.",
};

const SERVER_CODE_MESSAGE =
  "Boundary: apps/web never imports server code (CLAUDE.md, SPEC.md §8). Call the server over HTTP/SSE and share types via @curb/shared.";
const SERVER_CODE = {
  group: ["@curb/server", "@curb/server/*", "@curb/pipeline", "@curb/renderer"],
  message: SERVER_CODE_MESSAGE,
};
// Relative paths that climb out of apps/web into apps/server, e.g. "../../server/src/app.ts".
const SERVER_CODE_RELATIVE = {
  regex: "^(\\.\\./)+(apps/)?server(/|$)",
  message: SERVER_CODE_MESSAGE,
};

const SHARED_LEAF = {
  group: ["@curb/*", "!@curb/shared"],
  message:
    "Boundary: @curb/shared is the leaf package; it must not depend on other @curb packages (it would create a cycle).",
};

const NO_PROCESS_ENV = {
  object: "process",
  property: "env",
  message:
    "CLAUDE.md rule 4: environment variables (API keys, config) are read only in apps/server or the CLI. Pass values in as arguments.",
};

const NO_NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
  name,
  message: "CLAUDE.md rule 6: templates are pure and make no network calls; pass data in as props.",
}));

export default defineConfig(
  globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "out/",
    "samples/",
    "test-results/",
    "playwright-report/",
    ".claude/worktrees/",
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "scripts/*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/templates/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
    languageOptions: { globals: { ...globals.browser } },
  },

  // --- Boundaries -------------------------------------------------------------
  {
    files: ["packages/templates/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [MODEL_SDK, NODE_IO, NON_TEMPLATE_WORKSPACE] },
      ],
      "no-restricted-globals": ["error", ...NO_NETWORK_GLOBALS],
      "no-restricted-properties": ["error", NO_PROCESS_ENV],
    },
  },
  {
    files: ["apps/web/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [MODEL_SDK, SERVER_CODE, SERVER_CODE_RELATIVE] },
      ],
      "no-restricted-properties": ["error", NO_PROCESS_ENV],
    },
  },
  {
    files: ["packages/pipeline/src/**", "packages/renderer/src/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [MODEL_SDK] }],
      "no-restricted-properties": ["error", NO_PROCESS_ENV],
    },
  },
  {
    files: ["packages/shared/src/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [MODEL_SDK, SHARED_LEAF] }],
      "no-restricted-properties": ["error", NO_PROCESS_ENV],
    },
  },
);
