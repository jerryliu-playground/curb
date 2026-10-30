# 0013. Review API, approval contract and ZIP export

- Status: Accepted
- Date: 2026-10-30

## Context

Phase 2 adds the human review step (SPEC.md §3, §4 step 5): edit, swap, regenerate, approve, export. CLAUDE.md rule 3 (approval before export) and rule 8 (compliance flags always shown) must hold in the API, not just in the UI.

## Decision

- **Jobs** live in memory in `apps/server` (`JobService`, ADR 0003). One job = one generation that is edited in place. Progress streams over SSE (`GET /api/jobs/:id/events`), written directly with `reply.hijack()`; no SSE library. Each event tells the client to refetch the job view.
- **Every change re-validates the whole plan** (`CarouselPlanSchema` + `checkCarouselPlan`), re-renders only the changed slide, re-runs the compliance check (word list + model), and clears any approval.
- **Approval contract:** `POST /api/jobs/:id/approve` must list the id of every current compliance flag in `shownFlagIds`, or it fails with 409 and the missing ids. Approval is also refused while any slide overflows. The UI shows all flags in a panel that is always visible and asks for an explicit "I reviewed the flags" tick.
- **Export:** `GET /api/jobs/:id/export.zip` returns 409 until approved. The ZIP holds slide PNGs, `caption.txt`, `hashtags.txt`, `alt-text.txt` and, when there are flags, `compliance-flags.txt`. Built with `fflate` (`zipSync`, store-only since PNGs are already compressed).
- **Model in development:** the server uses the deterministic mock client unless `CURB_MODEL=anthropic` is set, so `pnpm dev` and the e2e tests never spend money by accident. The API port is `CURB_SERVER_PORT` (default 3001), not `PORT`, which dev tooling sets for the web app.

## Consequences

- Jobs are lost on restart; acceptable for the demo.
- Compliance re-checks after each edit cost one small model request in `anthropic` mode.
- Dependencies: `fflate` (MIT).
