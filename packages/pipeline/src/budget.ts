import type { Effort } from "./model-client.ts";

/** Budget caps (CLAUDE.md rule 9). Change them deliberately; they affect cost and eval scores. */
export const BUDGET = {
  /** Long edge of photos sent to the model. Opus 5.5 accepts 2576; tune with `pnpm eval`. */
  maxImageEdgePx: 1568,
  /** Photo analysis requests running at once. */
  photoAnalysisConcurrency: 4,
  photoAnalysis: { maxTokens: 4000, effort: "low" as Effort },
  carouselPlan: { maxTokens: 16000, effort: "medium" as Effort },
  /** One retry with the validation error, then fail (CLAUDE.md rule 1). */
  maxAttempts: 2,
  maxCritiqueRounds: 2,
} as const;
