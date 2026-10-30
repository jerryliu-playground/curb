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

| Package           | Role                                                                                              | May depend on                                |
| ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `@curb/shared`    | Types, zod schemas, compliance word list                                                          | — (leaf)                                     |
| `@curb/templates` | Pure React slide components (Modern, Classic, Editorial), brand-kit tokens, render-to-HTML helper | `shared`                                     |
| `@curb/renderer`  | Playwright HTML → PNG, DOM overflow measurement, `renderCarousel`                                 | `shared`, `templates`                        |
| `@curb/pipeline`  | Steps 1–4 as functions over a `ModelClient` interface; mocks in `@curb/pipeline/testing`          | `shared` (render is injected)                |
| `@curb/server`    | Fastify API, job runner, SSE progress, real `ModelClient`, env/config                             | all packages, `@anthropic-ai/sdk` (Phase 1)  |
| `@curb/web`       | React + Vite review UI                                                                            | `shared` (talks to the server over HTTP/SSE) |

```
web ──HTTP/SSE──▶ server ──▶ pipeline ──▶ shared
                    │                        ▲
                    └──────▶ renderer ──▶ templates
```

Internal packages export TypeScript source directly (`./src/index.ts`); there is no build step between them (ADR 0002).

The pipeline doesn't import the renderer: `generateCarousel` takes a `render` function, which the server (or CLI) wires to `renderCarousel`. That keeps pipeline tests free of Playwright.

## How a run works (Phase 1)

`pnpm generate --listing samples/01 [--mock]` (`apps/server/src/cli/generate.ts`):

1. Reads `listing.json` (validated with `ListingSchema`) and the photos.
2. Downscales photos with sharp to `BUDGET.maxImageEdgePx` for the model (ADR 0012).
3. **Photo analysis**: one request per photo, `prompts/photo-analysis.v1.md`, cached in `.cache/photo-analysis/` by image hash + prompt version + model.
4. **Carousel plan**: one text-only request with listing facts (no `review_notes`) and the analyses, `prompts/carousel-plan.v1.md`.
5. Every response goes through `generateValidated`: zod schema + extra checks (`checkCarouselPlan`), one retry with the problems, then `ValidationFailedError`.
6. **Render**: each slide → `renderSlideDocument` with the chosen template (`--template modern|classic|editorial`, default Modern; registry `TEMPLATES` in `packages/templates/src/index.ts`) → Playwright → PNG + overflow list. Photos and fonts are served from `https://assets.curb.local`; all other requests are blocked.
7. Writes `out/<id>/slide-NN-<type>.png`, `caption.txt`, `alt-text.txt`, `plan.json`, `photo-analysis.json`. Exits non-zero if any slide overflows.

`--mock` uses `createSampleModelClient`, a deterministic stand-in built from the sample's golden labels, so the whole pipeline runs without an API key. Without `--mock` it needs `ANTHROPIC_API_KEY` and costs money.

## Critique, compliance and review (Phase 2)

`generateCarousel` now runs all of steps 1–4:

- **Critique rounds** (`steps/critique.ts`, `prompts/critique.v1.md`): the rendered slides (downscaled to `BUDGET.critiqueImageEdgePx`) plus measured overflow go to the model, which returns fixes (headline, body, photo, focal point) for slides that need them. `applyCritiqueFixes` applies them to copies; fixes that would break the plan are sent back as validation problems. Only changed slides are re-rendered. At most `BUDGET.maxCritiqueRounds` (2) rounds; the log of changes per round is kept and shown in the UI.
- **Compliance** (`steps/check-compliance.ts`, `prompts/compliance.v1.md`): the deterministic word list in `@curb/shared` plus a model review. Model flags must quote text that exists at their location. Flags are merged by location + phrase.
- **Regenerate one slide** (`steps/regenerate-slide.ts`, `prompts/slide-regenerate.v1.md`): same slide type, the user's note, photo uniqueness enforced.

The review flow lives in `apps/server` (`JobService`, routes under `/api`) and `apps/web` (start screen → progress → review). See ADR 0013 for the approval contract and export.

```
web (React)  ── POST /api/jobs ─────────▶ JobService.create → generateCarousel (steps 1–4)
             ◀─ SSE /api/jobs/:id/events ─ progress, updated, ready
             ── PATCH slide / copy, POST regenerate ─▶ validate → re-render slide → re-check compliance → clear approval
             ── POST approve {shownFlagIds} ─▶ every flag shown? no overflow? → approved
             ── GET export.zip ─▶ 409 unless approved
```

## Boundary rules (enforced)

Lint rules in [`eslint.config.js`](../eslint.config.js), proven by [`tests/boundaries.test.ts`](../tests/boundaries.test.ts). Details in ADR 0005.

- `templates`: no model SDK, no Node/file/network/browser modules, no `fetch`, no `process.env`, no `@curb/*` except `shared`.
- `web`: no server, pipeline or renderer code, no model SDK, no `process.env`.
- `pipeline`, `renderer`: no model SDK (use `ModelClient`), no `process.env`.
- `shared`: no other `@curb/*`.
- Only `apps/server` (and the dev CLI) reads environment variables and holds API keys.

## Sensors

| Command             | What it checks                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | `tsc --noEmit` at the root and in every package (strict settings)                                                           |
| `pnpm lint`         | ESLint, type-aware, including the boundary rules; zero warnings                                                             |
| `pnpm format:check` | Prettier                                                                                                                    |
| `pnpm test`         | Vitest: unit tests, pipeline tests with the mocked client, lint-rule tests                                                  |
| `pnpm test:render`  | Playwright render tests in `tests/render/`: every sample × template, max-length copy, and a check that overflow is detected |
| `pnpm test:e2e`     | Playwright end-to-end test of the review UI against the server in mock mode                                                 |
| `pnpm check`        | All of the above, in that order; CI runs exactly this                                                                       |
| `pnpm eval`         | Real model over `samples/` → `evals/report.md` (Phase 3, costs money)                                                       |

## Layout

```
apps/web            review UI
apps/server         API + jobs
packages/*          see table above
samples/NN/         sample listings: photos, listing.json, labels.json, credits.json (don't modify casually)
tests/              repo-level tests: lint rules, render/ (Playwright)
scripts/            small Node scripts used by package.json
.cache/, out/       local cache and CLI output (git-ignored)
docs/               this file, domain.md, harness-log.md, adr/
.claude/skills/     agent skills: add-slide-type, add-template, tune-prompt
```
