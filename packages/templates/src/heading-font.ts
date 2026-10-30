import type { CSSProperties } from "react";
import type { SlideContext } from "./types.ts";

/** The brand kit's default heading font. Brand kits that keep it get the template's own face. */
export const DEFAULT_HEADING_FONT = "Inter";

/**
 * Sets `--template-heading` on a slide's root element. Templates with a signature heading face
 * (Classic's serif, Editorial's display serif) use it when the brand kit still has the generic
 * default heading font; a brand kit that picked a different bundled font keeps its choice.
 */
export function templateHeadingStyle(ctx: SlideContext, templateFont: string): CSSProperties {
  const font =
    ctx.brandKit.fonts.heading === DEFAULT_HEADING_FONT
      ? `"${templateFont}", serif`
      : "var(--font-heading)";
  return { "--template-heading": font } as CSSProperties;
}
