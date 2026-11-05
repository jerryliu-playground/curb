import type { Usage } from "@curb/pipeline";
import type { CarouselPlan, ComplianceFlag, JudgeVerdict, PhotoAnalysis } from "@curb/shared";
import type { ClaimCheck } from "./claims.ts";

/** Bump when the shape of a saved run changes; older runs are skipped in comparisons. */
export const EVAL_RUN_FORMAT = 1;

/** Checks that need no model: the same plan always gets the same scores. */
export interface DeterministicScores {
  slideCount: number;
  hashtagCount: number;
  /** Text boxes that don't fit, per template, e.g. `{ modern: ["slide 2: headline"] }`. */
  overflow: Record<string, string[]>;
  /** Schema and plan-rule problems: character limits, slide and hashtag counts, structure. */
  ruleProblems: string[];
  /** Photos used on more than one slide. */
  reusedPhotos: string[];
  complianceFlags: { wordList: number; model: number };
  /** Photo analysis room types compared with the golden labels. */
  roomTypes: { correct: number; total: number; mismatches: string[] };
  critique: { rounds: number; changes: number };
}

export interface ListingEval {
  id: string;
  /** Street and city, for the report. */
  title: string;
  status: "ok" | "failed";
  /** Why generation failed (status "failed"). */
  error?: string;
  durationMs: number;
  /** Tokens spent generating the carousel. */
  usage: Usage;
  deterministic?: DeterministicScores;
  judge?: JudgeVerdict;
  /** Why the judge failed; the deterministic scores still count. */
  judgeError?: string;
  /** The judge's unsupported claims, each checked against the photo analysis (claims.ts). */
  claims?: ClaimCheck[];
  judgeUsage?: Usage;
  /** The final plan and flags, kept so runs can be inspected and diffed later. */
  plan?: CarouselPlan;
  analyses?: PhotoAnalysis[];
  flags?: ComplianceFlag[];
}

/** One `pnpm eval` run, saved as `evals/runs/<id>.json`. */
export interface EvalRun {
  format: typeof EVAL_RUN_FORMAT;
  id: string;
  startedAt: string;
  /** Short commit hash, with "-dirty" when the working tree had changes. */
  commit: string;
  mode: "real" | "mock";
  model: string;
  /** Null when the judge was skipped (`--no-judge`). */
  judgeModel: string | null;
  /** Prompt name → version used for this run. */
  prompts: Record<string, number>;
  /** Templates the final plans were rendered with for the overflow check. */
  templates: string[];
  listings: ListingEval[];
}
