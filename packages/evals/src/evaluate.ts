import type { CarouselResult, ModelClient, Usage } from "@curb/pipeline";
import type { SampleLabels } from "@curb/pipeline/testing";
import type { Listing } from "@curb/shared";
import { classifyClaims } from "./claims.ts";
import { scoreDeterministic } from "./deterministic.ts";
import { judgeCarousel } from "./judge.ts";
import type { ListingEval } from "./types.ts";

export interface EvaluateListingInput {
  listing: Listing;
  labels: SampleLabels;
  photoFiles: readonly string[];
  /** Runs the pipeline (steps 1–4) for this listing. Injected: the runner owns I/O and the model. */
  generate: () => Promise<CarouselResult>;
  /** Renders the final plan with every template and returns the overflowing boxes per template. */
  checkOverflow: (result: CarouselResult) => Promise<Record<string, string[]>>;
  /** Omit to skip the LLM-as-judge half. */
  judge?: ModelClient;
  now?: () => number;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Evaluates one listing. A failing pipeline run is recorded as "failed" instead of stopping the
 * whole eval; a failing judge keeps the deterministic scores.
 */
export async function evaluateListing(input: EvaluateListingInput): Promise<ListingEval> {
  const now = input.now ?? Date.now;
  const started = now();
  const { listing } = input;
  const base = {
    id: listing.id,
    title: `${listing.address.street}, ${listing.address.city}`,
  };

  let result: CarouselResult;
  let overflow: Record<string, string[]>;
  try {
    result = await input.generate();
    overflow = await input.checkOverflow(result);
  } catch (error) {
    return {
      ...base,
      status: "failed",
      error: message(error),
      durationMs: now() - started,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const evaluation: ListingEval = {
    ...base,
    status: "ok",
    durationMs: 0,
    usage: result.usage,
    deterministic: scoreDeterministic({
      result,
      labels: input.labels,
      photoFiles: input.photoFiles,
      overflow,
    }),
    plan: result.plan,
    analyses: result.analyses,
    flags: result.flags,
  };

  if (input.judge) {
    const judgeUsage: Usage = { inputTokens: 0, outputTokens: 0 };
    try {
      evaluation.judge = await judgeCarousel({
        client: input.judge,
        listing,
        labels: input.labels,
        plan: result.plan,
        usage: judgeUsage,
      });
      evaluation.claims = classifyClaims(
        evaluation.judge.accuracy.unsupportedClaims,
        result.plan,
        result.analyses,
      );
    } catch (error) {
      evaluation.judgeError = message(error);
    }
    evaluation.judgeUsage = judgeUsage;
  }

  evaluation.durationMs = now() - started;
  return evaluation;
}
