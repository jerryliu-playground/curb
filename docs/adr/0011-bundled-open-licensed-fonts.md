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

| Family | Package                                                                               | Licence | Used by |
| ------ | ------------------------------------------------------------------------------------- | ------- | ------- |
| Inter  | `@fontsource-variable/inter` 5.3.0 (`inter-latin-wght-normal.woff2`, weights 100–900) | OFL-1.1 | Modern  |

The renderer serves font files from `https://assets.curb.local/fonts/` through a Playwright route; pages can't reach the network.
