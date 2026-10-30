# 0009. Reel composition with local ffmpeg

- Status: Accepted (applies from Phase 4)
- Date: 2026-10-29
- Resolves: SPEC.md §10, "Shotstack vs. ffmpeg for the reel"

## Context

Phase 4 (optional) builds a 15–20 s 1080×1920 reel: Ken Burns pans over photos, animated captions, voiceover and music.

- **Shotstack** (hosted render API): pay-as-you-go about $10 per 50 minutes, plans from $39/month; the sandbox is free but watermarked and needs at least one credit. All asset URLs must be public HTTPS, so local photos and fonts would have to be uploaded through its Ingest API first. It matches the target company's stack.
- **ffmpeg** (local binary): free, offline, deterministic, already part of the Playwright toolchain's world. LGPL by default; a GPL build (e.g. with libx264) is fine for running locally because we don't redistribute it.

## Decision

Use **local ffmpeg**, called by spawning the binary with `child_process.spawn` and explicit arguments. Don't use `fluent-ffmpeg`: it was archived on 2025-05-22 and is marked unmaintained.

Keep the reel step behind a small `ReelComposer` interface so a Shotstack implementation can be added later (e.g. to demo the target stack) without touching the pipeline.

## Consequences

- No hosted-asset uploads, no per-minute cost, works in CI.
- The developer machine and CI need ffmpeg installed; documented in Phase 4.
- Sources: shotstack.io pricing and docs; ffmpeg.org/legal.html; github.com/fluent-ffmpeg/node-fluent-ffmpeg. Checked 2026-10-29.
