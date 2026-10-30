import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

// Sensor test for the boundary rules in eslint.config.js: each case must be reported,
// and the message must point at the CLAUDE.md rule so the fix is obvious.
const eslint = new ESLint({
  cwd: process.cwd(),
  // Probe files don't exist on disk, so skip type-aware rules; the boundary rules are syntactic.
  overrideConfig: [tseslint.configs.disableTypeChecked],
});

async function messagesFor(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => ({ ruleId: m.ruleId, message: m.message }));
}

const violations = [
  {
    name: "templates import the model SDK",
    file: "packages/templates/src/probe.tsx",
    code: 'import Anthropic from "@anthropic-ai/sdk";\nexport const a = Anthropic;\n',
    rule: "no-restricted-imports",
    mentions: "rule 4/5",
  },
  {
    name: "templates read files",
    file: "packages/templates/src/probe.tsx",
    code: 'import { readFileSync } from "node:fs";\nexport const r = readFileSync;\n',
    rule: "no-restricted-imports",
    mentions: "rule 6",
  },
  {
    name: "templates import pipeline code",
    file: "packages/templates/src/probe.tsx",
    code: 'import * as p from "@curb/pipeline";\nexport const x = p;\n',
    rule: "no-restricted-imports",
    mentions: "rule 6",
  },
  {
    name: "templates call fetch",
    file: "packages/templates/src/probe.tsx",
    code: 'export const load = () => fetch("https://example.com");\n',
    rule: "no-restricted-globals",
    mentions: "rule 6",
  },
  {
    name: "web imports server code",
    file: "apps/web/src/probe.ts",
    code: 'import { buildApp } from "../../server/src/app.ts";\nexport const b = buildApp;\n',
    rule: "no-restricted-imports",
    mentions: "apps/web never imports server code",
  },
  {
    name: "web imports the server package",
    file: "apps/web/src/probe.ts",
    code: 'import * as s from "@curb/server";\nexport const x = s;\n',
    rule: "no-restricted-imports",
    mentions: "apps/web never imports server code",
  },
  {
    name: "pipeline imports the model SDK directly",
    file: "packages/pipeline/src/probe.ts",
    code: 'import Anthropic from "@anthropic-ai/sdk";\nexport const a = Anthropic;\n',
    rule: "no-restricted-imports",
    mentions: "ModelClient",
  },
  {
    name: "a package reads process.env",
    file: "packages/pipeline/src/probe.ts",
    code: "export const key = process.env.ANTHROPIC_API_KEY;\n",
    rule: "no-restricted-properties",
    mentions: "rule 4",
  },
  {
    name: "shared depends on another workspace package",
    file: "packages/shared/src/probe.ts",
    code: 'import * as t from "@curb/templates";\nexport const x = t;\n',
    rule: "no-restricted-imports",
    mentions: "leaf package",
  },
];

describe("boundary lint rules", () => {
  it.each(violations)("reports: $name", async ({ file, code, rule, mentions }) => {
    const messages = await messagesFor(file, code);
    const hit = messages.find((m) => m.ruleId === rule);
    expect(hit, JSON.stringify(messages)).toBeDefined();
    expect(hit?.message).toContain(mentions);
  });

  it("allows the server to read process.env", async () => {
    const messages = await messagesFor(
      "apps/server/src/probe.ts",
      "export const port = process.env.PORT;\n",
    );
    expect(messages.filter((m) => m.ruleId === "no-restricted-properties")).toEqual([]);
  });

  it("allows templates to import @curb/shared", async () => {
    const messages = await messagesFor(
      "packages/templates/src/probe.tsx",
      'import * as shared from "@curb/shared";\nexport const s = shared;\n',
    );
    expect(messages.filter((m) => m.ruleId === "no-restricted-imports")).toEqual([]);
  });
});
