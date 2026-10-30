# 0012. sharp for photo preprocessing

- Status: Accepted
- Date: 2026-10-29

## Context

Photos must be downscaled before they are sent to the model (CLAUDE.md rule 9, SPEC.md §7), and uploads will need re-encoding (SPEC.md §7). Sample photos are up to 2000 px wide; the model budget is a 1568 px long edge (ADR 0006).

## Decision

- Use `sharp` (libvips bindings) in `apps/server` only: auto-rotate from EXIF, resize to fit inside `BUDGET.maxImageEdgePx` without enlarging, re-encode as JPEG quality 85.
- The model gets the downscaled copy; the renderer uses the original files, so slide quality doesn't depend on the model budget.
- The photo-analysis cache key is the SHA-256 of the downscaled image + prompt version + model id, so changing any of them invalidates the cache.

## Consequences

- sharp ships prebuilt native binaries for macOS and Linux; no build script approval needed with pnpm.
- Dependencies: `sharp`.
