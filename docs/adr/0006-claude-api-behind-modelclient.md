# 0006. Claude API behind a `ModelClient` interface

- Status: Accepted
- Date: 2026-10-29

## Context

Photo analysis, carousel planning and critique all need a vision-capable model with structured output. Tests must be deterministic and never call a real API (CLAUDE.md rule 5), and keys stay on the server (rule 4).

## Decision

- **Provider:** Claude API through the official `@anthropic-ai/sdk` (added in Phase 1, not now).
- **Interface:** `packages/pipeline` defines a small `ModelClient` interface (roughly: send a prompt + images + a zod schema, get back validated data and usage). Pipeline steps depend only on that interface. Lint forbids importing `@anthropic-ai/*` anywhere except `apps/server` and the CLI (ADR 0005).
- **Implementations:** the real client lives in `apps/server` (also used by the dev CLI) and reads `ANTHROPIC_API_KEY` from the environment. Tests use a mocked client that returns recorded fixtures.
- **Model:** default `claude-opus-5-5` for every step, configurable per step in server config so `pnpm eval` can compare cheaper models later (`claude-sonnet-5-5`, `claude-haiku-5-5`). Use exact IDs without date suffixes.
- **Request settings for Opus 5.5** (checked against current API docs):
  - Thinking cannot be disabled; control depth and cost with `output_config.effort`. Its default on Opus 5.5 is `medium`, so set it explicitly per step.
  - Don't send `temperature` / `top_p` / `top_k` (400 on every model since 2026-10-21).
  - Forced `tool_choice` (`any` / `tool`) returns 400 on Opus 5.5 and Sonnet 5.5. See ADR 0007.
  - Check `stop_reason` before reading content; `refusal` and `max_tokens` are failures, not partial successes.
- **Budgets (rule 9):** per-step `max_tokens` caps in config; images downscaled on the server before sending. Opus 5.5 accepts up to 2576 px on the long edge, and image tokens scale with pixel area, so start at a 1568 px long edge and tune with `pnpm eval`. Photo analysis is cached by image hash (SPEC.md §7).
- **Refusal fallback:** requests send `fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta, so a policy decline is retried on the API's default fallback model inside the same call. A final `refusal` is still a failure.
- **Logging:** never log keys; log prompts with user content only in debug mode (`pnpm generate --debug`).

## Consequences

- Swapping models or providers touches one implementation, not the pipeline.
- Mock fixtures must be refreshed when prompts or schemas change; `pnpm eval` is the only real-model run.
- Sources: Claude API docs for models, structured outputs and vision (docs.claude.com / platform.claude.com), checked 2026-10-29.
