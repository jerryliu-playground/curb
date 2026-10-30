# 0002. pnpm workspace monorepo with strict TypeScript

- Status: Accepted
- Date: 2026-10-29

## Context

SPEC.md §6 splits Curb into two apps and four packages with clear boundaries (templates are pure, web never imports server code). We want one install, one lockfile, one `pnpm check`, and type errors across package boundaries caught immediately.

## Decision

- pnpm workspaces: `apps/*` and `packages/*`. Packages are named `@curb/<dir>` and depend on each other with `workspace:*`.
- pnpm version pinned through `packageManager` in the root `package.json` (CI reads it). Build scripts are opt-in through `allowBuilds` in `pnpm-workspace.yaml` (currently only `esbuild`).
- Node `>=24` (`.nvmrc` = 24). Node 26 became Active LTS on 2026-10-28; moving to it is a later, separate change.
- **No build step for internal packages.** Each package exports `./src/index.ts` directly; Vite, Vitest, Playwright and tsx all consume TypeScript source. `apps/server` runs with `tsx`. A production build is decided when Phase 5 deploys.
- One `tsconfig.base.json` that every package extends: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: "Bundler"`, `noEmit`, `allowImportingTsExtensions`. Each package sets only `lib`, `jsx` and `types`.
- `pnpm typecheck` runs `tsc --noEmit` at the root (config files, scripts, tests) and in every package.
- **TypeScript is pinned to `~6.0.3`, not 7.x.** TypeScript 7.0.2 is the npm `latest`, but typescript-eslint 8.72.1 declares `typescript >=4.8.4 <6.1.0`. Revisit when typescript-eslint supports 7.

## Consequences

- No `dist/` to keep in sync; editing a package is visible everywhere immediately.
- Imports between files use explicit `.ts` extensions (works for tsx, Vite and Node type stripping).
- Dependencies: `typescript`, `@types/node`, `tsx`.
