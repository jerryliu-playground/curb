// Pure React slide components and brand-kit tokens. No model calls, no I/O (CLAUDE.md rule 6).
import { modernTemplate } from "./modern/index.ts";
import type { Template } from "./types.ts";

export { DEMO_BRAND_KIT } from "./brand-kits.ts";
export * from "./document.tsx";
export * from "./format.ts";
export { modernTemplate } from "./modern/index.ts";
export type * from "./types.ts";

export const TEMPLATES = { modern: modernTemplate } as const satisfies Record<string, Template>;
export type TemplateName = keyof typeof TEMPLATES;
