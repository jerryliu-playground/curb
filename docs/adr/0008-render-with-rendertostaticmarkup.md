# 0008. Render slides with `renderToStaticMarkup` + `page.setContent`

- Status: Accepted
- Date: 2026-10-29
- Resolves: SPEC.md §10, "renderToStaticMarkup vs. serving a small render route"

## Context

Slides are React components in `packages/templates`. The renderer must turn a slide + brand kit into a 1080×1350 PNG deterministically, and measure DOM overflow (CLAUDE.md rule 7).

Options:

1. Render to an HTML string in Node with `react-dom/server` `renderToStaticMarkup`, load it with Playwright `page.setContent`, screenshot.
2. Serve a small render route (Vite or Fastify) that mounts the component in the browser; Playwright navigates to it.

## Decision

Option 1.

- `renderToStaticMarkup` is current and documented in React 19.3 (no deprecation notice). It is synchronous and produces plain HTML with no hydration markers, which suits pure templates.
- No server or port to manage in tests or in the job runner; each render is a pure function of its inputs.
- `packages/templates` exports a render-to-HTML helper that wraps the slide in a full document with brand-kit CSS variables and locally bundled fonts (ADR 0011) inlined, so `setContent` needs no network.
- Before screenshotting, the renderer waits for `document.fonts.ready`, then measures overflow by comparing each text box's `scrollWidth/scrollHeight` with its client size.
- Viewport 1080×1350, `deviceScaleFactor: 1` (`SLIDE_VIEWPORT` in `@curb/renderer`).

Not chosen: `react-dom/static` `prerender`. It is async and waits for Suspense data, which pure templates never use, and it expects the component to render the whole `<html>` document.

## Consequences

- Templates must not rely on client-side effects (`useEffect`, state) for layout; they won't run. This matches rule 6.
- Images are passed as `file://` URLs or data URIs; decided in Phase 1 when the renderer is built.
- Sources: react.dev `renderToStaticMarkup` and `prerender` reference; playwright.dev emulation and page API. Checked 2026-10-29.
