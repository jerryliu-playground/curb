// Pure React slide components and brand-kit tokens. No model calls, no I/O (CLAUDE.md rule 6).
import { classicTemplate } from "./classic/index.ts";
import { editorialTemplate } from "./editorial/index.ts";
import { modernTemplate } from "./modern/index.ts";
import type { Template } from "./types.ts";

export { DEMO_BRAND_KIT } from "./brand-kits.ts";
export { classicTemplate } from "./classic/index.ts";
export * from "./document.tsx";
export { editorialTemplate } from "./editorial/index.ts";
export * from "./format.ts";
export { DEFAULT_HEADING_FONT, templateHeadingStyle } from "./heading-font.ts";
export { modernTemplate } from "./modern/index.ts";
export type * from "./types.ts";

export const TEMPLATES = {
  modern: modernTemplate,
  classic: classicTemplate,
  editorial: editorialTemplate,
} as const satisfies Record<string, Template>;
export type TemplateName = keyof typeof TEMPLATES;
