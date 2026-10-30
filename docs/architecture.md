# Architecture

Curb turns a listing (photos + details + brand kit) into an Instagram carousel. This page describes the code structure and the rules that keep it in shape. Product scope is in [SPEC.md](../SPEC.md); decisions and their reasons are in [adr/](adr/README.md).

## Pipeline

```
listing + photos + brand kit
  → 1. photo analysis   (model, vision)      → PhotoAnalysis[]
  → 2. carousel plan    (model, structured)  → CarouselPlan + caption + hashtags + alt text
  → 3. render           (templates → HTML → Playwright PNG, overflow measured)
  → 4. critique round   (model, vision; max 2 rounds) → fixes → re-render
  → 5. human review     (web UI: edit / swap / regenerate → approve → export)
```

Every model output is validated against a zod schema from `@curb/shared` (ADR 0007). Export only happens after approval in the UI, with compliance flags shown.

## Packages

| Package           | Role                                                                  | May depend on                                |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `@curb/shared`    | Types, zod schemas, compliance word list                              | — (leaf)                                     |
| `@curb/templates` | Pure React slide components, brand-kit tokens, render-to-HTML helper  | `shared`                                     |
| `@curb/renderer`  | Playwright HTML → PNG, DOM overflow measurement                       | `shared`                                     |
| `@curb/pipeline`  | Steps 1–4 as functions over a `ModelClient` interface                 | `shared`, `templates`, `renderer`            |
| `@curb/server`    | Fastify API, job runner, SSE progress, real `ModelClient`, env/config | all packages, `@anthropic-ai/sdk` (Phase 1)  |
| `@curb/web`       | React + Vite review UI                                                | `shared` (talks to the server over HTTP/SSE) |

```
            web ──HTTP/SSE──▶ server
                               │
                            pipeline ──▶ renderer
                               │    └──▶ templates
                               ▼
                             shared ◀── (everyone)
```

Internal packages export TypeScript source directly (`./src/index.ts`); there is no build step between them (ADR 0002).

## Boundary rules (enforced)

Lint rules in [`eslint.config.js`](../eslint.config.js), proven by [`tests/boundaries.test.ts`](../tests/boundaries.test.ts). Details in ADR 0005.

- `templates`: no model SDK, no Node/file/network/browser modules, no `fetch`, no `process.env`, no `@curb/*` except `shared`.
- `web`: no server, pipeline or renderer code, no model SDK, no `process.env`.
- `pipeline`, `renderer`: no model SDK (use `ModelClient`), no `process.env`.
- `shared`: no other `@curb/*`.
- Only `apps/server` (and the dev CLI) reads environment variables and holds API keys.

## Sensors

| Command             | What it checks                                                             |
| ------------------- | -------------------------------------------------------------------------- |
| `pnpm typecheck`    | `tsc --noEmit` at the root and in every package (strict settings)          |
| `pnpm lint`         | ESLint, type-aware, including the boundary rules; zero warnings            |
| `pnpm format:check` | Prettier                                                                   |
| `pnpm test`         | Vitest: unit tests, pipeline tests with the mocked client, lint-rule tests |
| `pnpm test:render`  | Playwright render tests (every slide type × template, no overflow)         |
| `pnpm check`        | All of the above, in that order; CI runs exactly this                      |
| `pnpm eval`         | Real model over `samples/` → `evals/report.md` (Phase 3, costs money)      |

## Layout

```
apps/web            review UI
apps/server         API + jobs
packages/*          see table above
samples/NN/         sample listings: photos, listing.json, labels.json, credits.json (don't modify casually)
tests/              repo-level tests (lint rules)
scripts/            small Node scripts used by package.json
docs/               this file, domain.md, harness-log.md, adr/
.claude/skills/     agent skills: add-slide-type, add-template, tune-prompt
```
