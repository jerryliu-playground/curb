# 0011. Bundle open-licensed fonts locally

- Status: Accepted (fonts are added with the first template in Phase 1)
- Date: 2026-10-29

## Context

Render tests check pixel output and DOM overflow. If fonts load from a CDN, renders depend on the network and can differ between machines, which breaks determinism (rule 5, rule 7).

## Decision

- Use only fonts under the SIL Open Font License (Google Fonts families).
- Install them from npm `@fontsource/*` / `@fontsource-variable/*` packages, which ship the font files inside the package (e.g. `@fontsource-variable/inter` 5.3.0, OFL-1.1). Check each family's licence when adding it and note it here.
- The render-to-HTML helper inlines `@font-face` rules pointing at the local files; the renderer waits for `document.fonts.ready` before screenshotting (ADR 0008).
- Brand kits choose from the bundled fonts; arbitrary uploaded fonts are out of scope.

## Consequences

- Renders work offline and match between local runs and CI.
- Fonts per template are added in a later change, each named in this ADR.

## Bundled fonts

| Family             | Package                                                                                                                  | Licence | Used by                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------- |
| Inter              | `@fontsource-variable/inter` 5.3.0 (`inter-latin-wght-normal.woff2`, weights 100–900)                                    | OFL-1.1 | Modern; body text in every template (demo brand kit) |
| Cormorant Garamond | `@fontsource-variable/cormorant-garamond` 5.3.0 (`cormorant-garamond-latin-wght-{normal,italic}.woff2`, weights 300–700) | OFL-1.1 | Classic headings                                     |
| Playfair Display   | `@fontsource-variable/playfair-display` 5.3.0 (`playfair-display-latin-wght-{normal,italic}.woff2`, weights 400–900)     | OFL-1.1 | Editorial display type and pull quotes               |

All are listed in `BUNDLED_FONTS` (`packages/shared/src/brand-kit.ts`), so a brand kit can choose any of them. Each file is registered in `packages/renderer/src/fonts.ts`.

The renderer serves font files from `https://assets.curb.local/fonts/` through a Playwright route; pages can't reach the network.

### Template heading fonts (added 2026-10-30)

Classic and Editorial have a signature heading face. When the brand kit keeps the default heading font (Inter), the template uses its own face; a brand kit that picked another bundled font keeps its choice. The slide root sets `--template-heading` for this (`packages/templates/src/heading-font.ts`). Body text always uses the brand kit's `--font-body`.

Serif faces have tall ascenders and descenders: below `line-height` ≈ 1.25 (Cormorant Garamond) or 1.3 (Playfair Display) the glyphs overflow their line box and the render test reports it. Size text boxes with those line heights.
