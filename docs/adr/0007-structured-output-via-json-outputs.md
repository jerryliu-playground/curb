# 0007. Structured output: JSON outputs (`output_config.format`) over tool use

- Status: Accepted
- Date: 2026-10-29
- Resolves: SPEC.md §10, "Structured output via tool use vs. a JSON-schema response mode"

## Context

Every model output must match a zod schema in `packages/shared`; on failure we retry once with the validation error, then fail loudly (CLAUDE.md rule 1). The Claude API offers two ways to get schema-shaped JSON:

1. **JSON outputs:** `output_config: { format: { type: "json_schema", ... } }` constrains the response itself. The TypeScript SDK wraps this as `client.messages.parse()` + `zodOutputFormat(schema)` from `@anthropic-ai/sdk/helpers/zod`, returning `parsed_output`.
2. **Strict tool use:** a tool with `strict: true` whose `input_schema` is the output shape, and the model is told to call it.

## Decision

Use **JSON outputs** with `messages.parse()` and `zodOutputFormat`, for every step (photo analysis, carousel plan, critique, compliance).

Why:

- It is the documented recommended path for "give me JSON in this shape", and decoding is constrained to the schema.
- Tool use for extraction needs a forced `tool_choice`, which returns 400 on `claude-opus-5-5` and `claude-sonnet-5-5`. With `auto` the model may answer in prose instead, which adds a failure mode.
- One schema source: the zod schema in `packages/shared` drives both the request and our validation.

Rules that come with it:

- **Still validate ourselves.** After `parse()`, run the shared zod schema's `safeParse` in the pipeline (the mocked client goes through the same path). On failure: one retry that includes the validation error, then throw.
- **Schema limits:** JSON outputs don't support recursive schemas, numeric limits (`minimum`, `maximum`), string length limits (`minLength`, `maxLength`) or complex array constraints, and every object needs `additionalProperties: false`. The SDK strips unsupported constraints from the request and checks them client-side. So limits like headline length are enforced by zod after the response, not by decoding. That is acceptable because rule 1 already requires validation and retry.
- `stop_reason` of `refusal` or `max_tokens` means the output may not match the schema: treat it as a failure.
- Not compatible with citations or prefill; we use neither.
- A new schema has a one-time compile latency (cached 24 h); keep schemas stable between runs.

## Consequences

- Schemas in `packages/shared` should avoid recursion and keep objects closed (`z.strictObject` / `.strict()`).
- If a future step needs the model to call real tools (not just return data), that step uses strict tool use with `tool_choice: auto`, recorded in a new ADR.
- Sources: Claude API structured outputs docs and TypeScript SDK helpers, checked 2026-10-29.
