# CLAUDE.md — Curb

Read `SPEC.md` before starting any task. Read `docs/architecture.md` and the relevant ADRs before changing structure.

## What this project is
A pipeline that turns a real-estate listing into an on-brand Instagram carousel (and later a reel): photo analysis → structured carousel plan → template rendering with Playwright → self-critique loop → human review and export. Building it through a documented harness is part of every task.

## Stack (decided — do not change without an ADR)
- pnpm workspace monorepo · TypeScript strict in every package
- `apps/web`: React + Vite review UI
- `apps/server`: Node + Fastify, runs generation jobs, streams progress over SSE
- `packages/pipeline`: pipeline steps as functions over a `ModelClient` interface
- `packages/templates`: React slide components + brand-kit tokens
- `packages/renderer`: Playwright HTML → PNG, DOM overflow measurement
- `packages/shared`: types, zod schemas, compliance word list
- Tests: Vitest, Playwright · Lint: ESLint + typescript-eslint · Format: Prettier

If a library's or model API's behaviour is uncertain, check its current documentation instead of guessing. Record any new dependency in an ADR.

## Commands
```bash
pnpm install
pnpm dev                              # web (5173) + server (3001); mock model unless CURB_MODEL=anthropic
pnpm generate --listing samples/01    # CLI pipeline run → out/ (real model, costs money; add --mock to run without the API)
pnpm check                            # typecheck + lint + format check + unit + render + e2e tests (must pass before a task is done)
pnpm format                           # apply Prettier
pnpm eval                             # runs the real model over samples → evals/report.md (costs money; run only when asked or when changing prompts; stub until Phase 3)
```
Keep this list accurate; update it when scripts change.

## Hard rules
1. **Schemas are the contract.** Every model output has a zod schema in `packages/shared`. Validate every response; on failure retry once with the validation error, then fail loudly. Never silently accept malformed output.
2. **No invented facts.** Copy may only state facts present in the listing data or visible in the photo analysis. Eval checks enforce this.
3. **Human approval before export.** Nothing is exported without the user approving it in the UI (the CLI is for development only).
4. **Secrets stay on the server.** API keys are read only in `apps/server` / CLI from environment variables. Never log keys or full prompts with user content outside debug mode.
5. **Deterministic tests.** Unit, render and pipeline tests use the mocked `ModelClient`. No test calls a real API. Only `pnpm eval` uses the real model.
6. **Templates are pure.** `packages/templates` contains no model calls, no I/O and no pipeline logic. Every template implements every slide type.
7. **Renders must fit.** Every slide type × template must render sample data with zero DOM overflow; the render test enforces this.
8. **Compliance flags are never hidden.** Flags from the compliance check are always shown to the user before export.
9. **Budget limits.** Respect the caps for tokens per request, critique rounds (max 2) and image size sent to the model.
10. **Small, reviewable changes.** One concern per change. Don't refactor unrelated code in the same task.

## Definition of done
- [ ] `pnpm check` passes locally
- [ ] New behaviour has tests (unit for logic, render tests for templates, pipeline tests with the mocked client)
- [ ] Prompt changes: `pnpm eval` run, scores compared against the previous report, result noted in the PR / commit message
- [ ] Docs updated if structure or decisions changed (architecture.md, ADR, domain.md)
- [ ] No new lint suppressions without a comment explaining why

## Harness upkeep
- If you make the same kind of mistake twice, or the user corrects the same thing twice, add an entry to `docs/harness-log.md` and propose a guide (rule, doc, skill) or a sensor (lint rule, test, check) that prevents it.
- When a check fails, read its message fully before changing code. If a custom check's message was not enough to fix the problem, improve the message.

## Style
- Functional React components with hooks.
- Explicit types at module boundaries; let inference work inside functions.
- Name things after the glossary in `docs/domain.md` (listing, photo analysis, slide, carousel plan, template, brand kit, critique round, compliance flag).
- Prompts live in their own files under `packages/pipeline/prompts/`, versioned, never inlined in logic.
- User-facing copy is short and plain.
