import {
  type CarouselPlan,
  CarouselPlanSchema,
  checkCarouselPlan,
  type Listing,
  listingFacts,
  type PhotoAnalysis,
} from "@curb/shared";
import { BUDGET } from "../budget.ts";
import type { ModelClient } from "../model-client.ts";
import { fillPrompt, loadPrompt } from "../prompts.ts";
import { generateValidated, type Usage } from "../structured.ts";

export const CAROUSEL_PLAN_PROMPT = { name: "carousel-plan", version: 1 } as const;

export interface PlanCarouselInput {
  client: ModelClient;
  listing: Listing;
  analyses: readonly PhotoAnalysis[];
  usage?: Usage;
}

/**
 * Step 2: a validated carousel plan. Text-only: the model plans from the listing facts and the
 * photo analyses, which keeps this request small.
 */
export async function planCarousel(input: PlanCarouselInput): Promise<CarouselPlan> {
  const prompt = loadPrompt(CAROUSEL_PLAN_PROMPT.name, CAROUSEL_PLAN_PROMPT.version);
  const files = input.analyses.map((a) => a.file);
  return generateValidated(
    input.client,
    {
      step: "carousel-plan",
      system: prompt.system,
      prompt: fillPrompt(prompt.user, {
        listing: JSON.stringify(listingFacts(input.listing), null, 2),
        analyses: JSON.stringify(input.analyses, null, 2),
      }),
      images: [],
      schema: CarouselPlanSchema,
      maxTokens: BUDGET.carouselPlan.maxTokens,
      effort: BUDGET.carouselPlan.effort,
    },
    (plan) => checkCarouselPlan(plan, files),
    input.usage,
  );
}
