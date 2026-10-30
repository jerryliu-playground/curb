---
name: add-slide-type
description: Add a new carousel slide type end to end — schema, plan prompt, a component in every template, render tests and an eval check. Use when asked to add or change a slide type (cover, feature, stats, gallery, neighbourhood, cta, or a new one).
---

# Add a slide type

A slide type is a contract shared by the schema, the plan prompt, every template and the evals. Change all of them in one change, in this order. Read `docs/domain.md` and `docs/architecture.md` first.

## Steps

1. **Schema** (`packages/shared`)
   - Add the type to the `SlideType` enum and define its fields in the slide schema (zod).
   - Keep objects closed (`.strict()`), no recursion; put length limits in zod (JSON outputs can't enforce them — ADR 0007).
   - Unit-test the schema: one valid example, and invalid examples for each limit.

2. **Plan prompt** (`packages/pipeline/prompts/`)
   - Describe when the planner should use this slide type and what goes in each field. Bump the prompt's version.
   - Prompts live in their own files, never inline in logic.
   - Update the mocked-client fixtures so pipeline tests cover a plan containing the new type.

3. **Templates** (`packages/templates`)
   - Implement the slide type in **every** template (rule 6: every template implements every slide type).
   - Pure components only: props in, markup out. No I/O, no effects for layout, no `process.env` (lint enforces this).
   - Use brand-kit CSS variables, not hard-coded colours or fonts.

4. **Render tests** (`packages/renderer/test`)
   - Add sample data for the new type and render it in every template. It must pass with zero DOM overflow (rule 7).
   - Include a long-copy case at the schema's maximum lengths.

5. **Evals** (`evals/`, Phase 3+)
   - Add a deterministic check for the new type (field limits, photo used at most once, etc.) and mention it in the rubric if the judge should score it.

6. **Docs**
   - Add the slide type to `docs/domain.md` and the slide-type list in SPEC.md if the product scope changed (ask the owner before editing SPEC.md).

## Done when

- `pnpm check` passes.
- The prompt changed, so run `pnpm eval` (costs money; confirm with the owner first) and compare against the previous `evals/report.md`. Note the result in the commit message.
