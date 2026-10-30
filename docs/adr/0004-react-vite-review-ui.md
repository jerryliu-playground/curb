# 0004. React + Vite for the review UI

- Status: Accepted
- Date: 2026-10-29

## Context

The review UI (Phase 2) shows a slide strip with per-slide edit, swap and regenerate, then approval and export. Slide templates are React components (ADR 0008), so the UI can show the same components the renderer screenshots.

## Decision

- `apps/web` is a React 19 single-page app built with Vite 8 and `@vitejs/plugin-react`.
- In development Vite proxies `/api` to the Fastify server on port 3001.
- Functional components with hooks; `eslint-plugin-react-hooks` enforces the hook rules.
- `apps/web` never imports server, pipeline or renderer code; it talks to the server over HTTP/SSE and shares types through `@curb/shared` (lint-enforced, ADR 0005).

## Consequences

- No server-side rendering; the UI is a static bundle served next to the API in Phase 5.
- Dependencies: `react`, `react-dom`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `eslint-plugin-react-hooks`.
