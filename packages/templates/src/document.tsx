import type { Slide, SlideType } from "@curb/shared";
import { renderToStaticMarkup } from "react-dom/server";
import type { SlideComponent, SlideContext, Template } from "./types.ts";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

/**
 * Text boxes that must fit carry `data-fit="<name>"`. The renderer reports any whose content
 * overflows (CLAUDE.md rule 7), so give each one a fixed size and `overflow: hidden`.
 */
export const FIT_ATTRIBUTE = "data-fit";

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
body { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
img { display: block; }
`;

function brandVariables(ctx: SlideContext): string {
  const { colors, fonts } = ctx.brandKit;
  return `:root {
  --c-primary: ${colors.primary};
  --c-accent: ${colors.accent};
  --c-bg: ${colors.background};
  --c-text: ${colors.text};
  --font-heading: "${fonts.heading}", sans-serif;
  --font-body: "${fonts.body}", sans-serif;
}`;
}

export function renderSlideMarkup(template: Template, slide: Slide, ctx: SlideContext): string {
  // The registry is keyed by slide type, so this lookup always matches the slide's own type.
  const Component = template.slides[slide.type] as SlideComponent<SlideType>;
  return renderToStaticMarkup(<Component slide={slide} ctx={ctx} />);
}

/**
 * A complete HTML document for one slide, ready for `page.setContent` (ADR 0008).
 * `fontFaceCss` comes from the renderer, which knows where the bundled font files are.
 */
export function renderSlideDocument(
  template: Template,
  slide: Slide,
  ctx: SlideContext,
  options: { fontFaceCss: string },
): string {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<style>${options.fontFaceCss}
${BASE_CSS}
${brandVariables(ctx)}
${template.css}</style>
</head>
<body>${renderSlideMarkup(template, slide, ctx)}</body>
</html>`;
}
