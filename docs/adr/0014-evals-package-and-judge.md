# 0014. Evals: a pure scoring package, a versioned judge prompt and saved runs

- Status: Accepted
- Date: 2026-11-04

## Context

Phase 3 (SPEC.md §5) adds `pnpm eval`: run the pipeline over the samples, score the results with deterministic checks and an LLM-as-judge, write `evals/report.md`, and track scores over time so prompt changes can be compared. It is the quality gate in the `tune-prompt` skill. The eval needs the real model, sharp and Playwright, but the boundary rules keep the model SDK and environment variables in `apps/server` only.

## Decision

- **`packages/evals` (`@curb/evals`)** holds the logic: `scoreDeterministic`, `judgeCarousel`, `evaluateListing`, the metric definitions and `renderReport`. It is pure over injected functions and a `ModelClient`, like `@curb/pipeline`, and the same lint boundaries apply (no model SDK, no `process.env`). It depends on `shared` and `pipeline`.
- **The runner** is `apps/server/src/cli/eval.ts`, next to `generate.ts`, because it needs the API key, sharp and the renderer. `pnpm eval` loads `.env` if it exists. `--mock` runs the sample client (no API calls) and writes to `out/eval-mock/` so it never replaces the real report.
- **Deterministic checks** per listing: overflow in every template (the final plan is rendered with each one), schema and plan-rule problems (character limits, slide and hashtag counts, structure), reused photos, compliance flags (word list and model), photo-analysis room types against `labels.json`, and the critique change count.
- **The judge** is a separate model request (`step: "eval-judge"`) with the rubric in `packages/pipeline/prompts/eval-judge.v1.md`, so it follows the rule that prompts live in versioned files. It sees listing facts, the golden photo labels as ground truth and the copy, not the images: cheaper, and accuracy is judged against what a person verified is visible. Output: `JudgeVerdictSchema` in `@curb/shared`. Unsupported claims must quote text that exists at their location, and the accuracy score must be 5 exactly when there are none; otherwise the response is retried once, then fails (CLAUDE.md rule 1). A failed judge keeps the deterministic scores; a failed generation is recorded and the eval continues.
- **Where unsupported claims come from:** the judge checks copy against the labels, so a claim is "unsupported" either because the plan step invented it or because the photo analysis described something the labels don't list (a label gap, or an analysis mistake). `classifyClaims` matches each claim's content words against the photo analysis of the photos on its slide (all photos for the caption) and splits them into _invented_ and _from photo analysis_, with the backing feature quoted. It's a word-overlap heuristic (60% of content words), so the report says "likely". Invented claims per listing is its own metric and blocks a prompt change when it gets worse. The first real run on sample 01 showed why this is needed: all 11 unsupported claims came from the photo analysis. Spot checks of four photos found most of them really there (a red sofa, a chaise lounge, dusk light) and one analysis mistake (a raised tub described as "sunken").
- **Saved runs:** every run writes `evals/runs/<id>.json` (scores, final plan, flags, prompt versions, models, commit) and regenerates `evals/report.md` from it. The report compares with the previous run in the same mode, names prompt, model, judge and listing changes, marks accuracy and compliance regressions as blocking, and shows a trend table. Metrics are computed from the saved runs, so old runs recompute the same way. Both are committed with the change they measure; Prettier ignores them.
- **Judge model:** `claude-opus-5-5` by default, the same as the pipeline; `--judge-model` can change it. A judge or judge-prompt change makes judge scores non-comparable, and the report says so.

## Consequences

- One real run costs about one generation per listing plus one text-only judge request per listing. Photo analysis is cached by image hash, prompt version and model, so a plan-prompt change only pays for the later steps; `--no-cache` forces a full run.
- The judge grades its own model family's output, and model output varies between runs. Compare trends, not single points, and look at the listed claims, not just the averages.
- `labels.json` is still marked draft; room-type accuracy is only as good as those labels.
- No new third-party dependencies.
