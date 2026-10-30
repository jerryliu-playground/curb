import {
  type CarouselPlan,
  checkCarouselPlan,
  type Listing,
  listingFacts,
  type PhotoAnalysis,
  type Slide,
  SlideSchema,
  slidePhotos,
} from "@curb/shared";
import { BUDGET } from "../budget.ts";
import type { ModelClient } from "../model-client.ts";
import { fillPrompt, loadPrompt } from "../prompts.ts";
import { generateValidated, type Usage } from "../structured.ts";

export const SLIDE_REGENERATE_PROMPT = { name: "slide-regenerate", version: 1 } as const;

export interface RegenerateSlideInput {
  client: ModelClient;
  listing: Listing;
  analyses: readonly PhotoAnalysis[];
  plan: CarouselPlan;
  index: number;
  /** The user's note, e.g. "make this one about the kitchen". */
  note: string;
  usage?: Usage;
}

/** Rewrites one slide, keeping its type, following the user's note. Returns the new slide. */
export async function regenerateSlide(input: RegenerateSlideInput): Promise<Slide> {
  const current = input.plan.slides[input.index];
  if (!current) throw new Error(`There is no slide ${input.index}.`);
  const prompt = loadPrompt(SLIDE_REGENERATE_PROMPT.name, SLIDE_REGENERATE_PROMPT.version);
  const usedElsewhere = input.plan.slides.flatMap((s, i) =>
    i === input.index ? [] : slidePhotos(s),
  );

  return generateValidated(
    input.client,
    {
      step: "slide-regenerate",
      system: prompt.system,
      prompt: fillPrompt(prompt.user, {
        index: String(input.index),
        type: current.type,
        note: input.note.trim() || "(no note; write a fresh version)",
        slide: JSON.stringify(current, null, 2),
        usedPhotos: usedElsewhere.length > 0 ? usedElsewhere.join(", ") : "none",
        listing: JSON.stringify(listingFacts(input.listing), null, 2),
        analyses: JSON.stringify(input.analyses, null, 2),
      }),
      images: [],
      schema: SlideSchema,
      maxTokens: BUDGET.slideRegenerate.maxTokens,
      effort: BUDGET.slideRegenerate.effort,
      meta: { slide: JSON.stringify(current) },
    },
    (slide) => {
      if (slide.type !== current.type) return [`Keep the slide type "${current.type}".`];
      const plan = {
        ...input.plan,
        slides: input.plan.slides.map((s, i) => (i === input.index ? slide : s)),
      };
      return checkCarouselPlan(
        plan,
        input.analyses.map((a) => a.file),
      );
    },
    input.usage,
  );
}
