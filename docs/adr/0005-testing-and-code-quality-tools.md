# 0005. Testing and code-quality tools, and boundary lint rules

- Status: Accepted
- Date: 2026-10-29

## Context

The harness needs fast, deterministic sensors (SPEC.md §8): typecheck, lint with boundary rules, unit tests, render tests. All must run with one command locally and in CI.

## Decision

- **Vitest 5** for unit and pipeline tests. One root `vitest.config.ts` picks up `{apps,packages}/*/{src,test}/**/*.test.ts(x)` and `tests/**/*.test.ts`.
- **Playwright 1.64** (`@playwright/test`) for render tests. Config lives in `packages/renderer/playwright.config.ts`, viewport 1080×1350, `deviceScaleFactor: 1`. Specs are `*.spec.ts` so Vitest and Playwright never pick up each other's files.
- **ESLint 10** flat config with `@eslint/js` recommended and `typescript-eslint` `recommendedTypeChecked` (project service). `--max-warnings 0`.
- **Prettier 3**, `printWidth: 100`. CLAUDE.md, SPEC.md and `samples/` are excluded.
- `pnpm check` = typecheck → lint → format check → Vitest → Playwright. CI runs exactly this.

### Boundary rules

Implemented with core `no-restricted-imports`, `no-restricted-globals` and `no-restricted-properties` (no plugin). typescript-eslint's own `no-restricted-imports` is deprecated; the core rule handles `import type` since ESLint 9.37.

| Where                                       | Forbidden                                                                                                                         | Why                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/templates`                        | model SDK, Node/file/network/browser modules, `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`, other `@curb/*` except `shared` | Templates are pure (rule 6)                     |
| `apps/web`                                  | `@curb/server`, `@curb/pipeline`, `@curb/renderer`, relative paths into `server/`, model SDK                                      | Web never imports server code                   |
| `packages/pipeline`, `packages/renderer`    | model SDK                                                                                                                         | Pipeline talks to `ModelClient` only (ADR 0006) |
| `packages/shared`                           | any other `@curb/*`                                                                                                               | Shared is the leaf package                      |
| everything except `apps/server` and tooling | `process.env`                                                                                                                     | Secrets stay on the server (rule 4)             |

Every message names the CLAUDE.md rule and the fix. `tests/boundaries.test.ts` lints probe snippets to prove each rule fires and that allowed cases pass, so a config edit can't silently disable a boundary.

## Consequences

- Type-aware linting is slower than syntax-only linting; acceptable at this size.
- Dependencies: `vitest`, `@playwright/test`, `playwright`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `prettier`.
