---
name: add-template
description: Add a new visual template (like Classic, Modern, Editorial) that implements every slide type with brand-kit tokens, plus render and visual snapshot tests. Use when asked to create or restyle a template.
---

# Add a template

Adding a template must never require changing the pipeline (SPEC.md §4). If you find you need to, stop and raise it with the owner.

## Steps

1. **Scaffold** a folder in `packages/templates/src/templates/<name>/` and register the template in the templates index.

2. **Implement every slide type.** Check the `SlideType` enum in `packages/shared`; the template must cover all of them (rule 6). A missing slide type is a type error, not a runtime surprise — keep the registry typed as `Record<SlideType, Component>`.

3. **Brand-kit tokens.** Read colours, fonts and logo only from the brand-kit CSS variables. Fonts must be bundled OFL fonts (ADR 0011); add any new font package to that ADR with its licence.

4. **Stay pure.** No I/O, no network, no `process.env`, no imports from pipeline/renderer/server. Lint enforces this; if lint fails, read the message — it names the rule and the fix.

5. **Render tests.** Every slide type × this template renders the shared sample data with zero DOM overflow, including the max-length copy cases.

6. **Visual snapshots.** Add Playwright screenshot snapshots for each slide type (tolerance-based). Review the first snapshots by eye before committing them.

7. **Docs.** Mention the template in `docs/architecture.md` if structure changed. A new dependency needs an ADR.

## Done when

- `pnpm check` passes, with the new render and snapshot tests.
- No change under `packages/pipeline`.
