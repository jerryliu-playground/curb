---
name: tune-prompt
description: Change a pipeline prompt safely — edit the versioned prompt file, run the eval, compare against the last report and record the result. Use whenever a prompt under packages/pipeline/prompts/ changes or the owner asks to improve output quality.
---

# Tune a prompt

`pnpm eval` calls the real model and costs money. Confirm with the owner before running it, and say roughly how many listings it will run over.

## Steps

1. **Baseline.** Read the current `evals/report.md` and note the scores you're trying to move (and the ones that must not drop, especially "no invented features" accuracy and compliance).

2. **One change at a time.** Edit one prompt file in `packages/pipeline/prompts/` and bump its version. Keep the prompt in its file; never inline it in logic. Don't change schemas in the same change unless the prompt change requires it.

3. **Keep tests deterministic.** Update mocked-client fixtures only if the expected output shape changed. `pnpm check` must pass without network access.

4. **Run the eval** (after the owner's OK): `pnpm eval`. It writes `evals/report.md`.

5. **Compare** against the baseline: per-metric before/after, and any listing that got worse. A regression on accuracy or compliance blocks the change even if other scores improve.

6. **Record** the comparison in the commit message (prompt name, old → new version, key score changes). If the change is kept, the new report is committed with it.

7. **Harness upkeep.** If the same failure keeps coming back, add an entry to `docs/harness-log.md` and propose a check that catches it.
