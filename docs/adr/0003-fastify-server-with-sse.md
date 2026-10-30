# 0003. Fastify server with job progress over SSE

- Status: Accepted
- Date: 2026-10-29

## Context

Generation is a long-running job (analysis → plan → render → critique). The review UI needs live progress, and API keys must stay on the server (CLAUDE.md rule 4). SPEC.md §6 rules out queue infrastructure.

## Decision

- `apps/server` uses Fastify 5. `buildApp()` returns the instance so tests use `app.inject()` without opening a port; `src/index.ts` only listens.
- Jobs run in-process. Progress is streamed with Server-Sent Events (one-way, plain HTTP, reconnects natively, no extra dependency).
- The server (and the development CLI) is the only place that reads environment variables and constructs the real model client. A lint rule enforces `process.env` usage (ADR 0005).
- Storage is the local filesystem; SQLite only if job history becomes necessary.

## Consequences

- One process to run and deploy. Jobs are lost on restart, which is acceptable for a demo.
- If SSE needs a helper later, choose it in a new ADR.
- Dependencies: `fastify`.
