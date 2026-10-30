import {
  type CarouselPlan,
  checkComplianceWordList,
  type ComplianceFlag,
  ComplianceReviewSchema,
  flagId,
  locationKey,
  mergeFlags,
  planCopy,
} from "@curb/shared";
import { BUDGET } from "../budget.ts";
import type { ModelClient } from "../model-client.ts";
import { fillPrompt, loadPrompt } from "../prompts.ts";
import { generateValidated, type Usage } from "../structured.ts";

export const COMPLIANCE_PROMPT = { name: "compliance", version: 1 } as const;

/**
 * Compliance check: the deterministic word list plus a model review. Model flags must quote
 * text that actually appears at the given location, so they can't point at nothing.
 */
export async function checkCompliance(input: {
  client: ModelClient;
  plan: CarouselPlan;
  usage?: Usage;
}): Promise<ComplianceFlag[]> {
  const copy = planCopy(input.plan);
  const wordListFlags = checkComplianceWordList(copy);
  const byLocation = new Map(copy.map((c) => [locationKey(c.location), c.text.toLowerCase()]));
  const prompt = loadPrompt(COMPLIANCE_PROMPT.name, COMPLIANCE_PROMPT.version);

  const review = await generateValidated(
    input.client,
    {
      step: "compliance",
      system: prompt.system,
      prompt: fillPrompt(prompt.user, { copy: JSON.stringify(copy, null, 2) }),
      images: [],
      schema: ComplianceReviewSchema,
      maxTokens: BUDGET.compliance.maxTokens,
      effort: BUDGET.compliance.effort,
    },
    (r) =>
      r.flags.flatMap((f) => {
        const text = byLocation.get(locationKey(f.location));
        if (text === undefined) return [`Flag location ${locationKey(f.location)} doesn't exist.`];
        if (!text.includes(f.phrase.toLowerCase())) {
          return [
            `Flag phrase "${f.phrase}" doesn't appear at ${locationKey(f.location)}; quote it exactly.`,
          ];
        }
        return [];
      }),
    input.usage,
  );

  const modelFlags: ComplianceFlag[] = review.flags.map((f) => ({
    id: flagId(f.location, f.phrase),
    location: f.location,
    phrase: f.phrase,
    ground: f.ground,
    reason: f.reason,
    suggestion: f.suggestion,
    source: "model",
  }));
  return mergeFlags(wordListFlags, modelFlags);
}
