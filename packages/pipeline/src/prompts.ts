import { readFileSync } from "node:fs";

export interface Prompt {
  name: string;
  version: number;
  system: string;
  user: string;
}

const PROMPTS_DIR = new URL("../prompts/", import.meta.url);

/**
 * Loads `prompts/<name>.v<version>.md`. The file has a `## System` and a `## User` section;
 * `{{name}}` placeholders in the user section are filled by `fillPrompt`.
 */
export function loadPrompt(name: string, version: number): Prompt {
  const text = readFileSync(new URL(`${name}.v${version}.md`, PROMPTS_DIR), "utf8");
  const system = /## System\n([\s\S]*?)\n## User\n/.exec(text)?.[1]?.trim();
  const user = /## User\n([\s\S]*)$/.exec(text)?.[1]?.trim();
  if (!system || !user) {
    throw new Error(`Prompt ${name}.v${version}.md needs a "## System" and a "## User" section.`);
  }
  return { name, version, system, user };
}

export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Prompt placeholder {{${key}}} has no value.`);
    return value;
  });
}
