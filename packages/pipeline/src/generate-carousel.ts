import type { BrandKit, CarouselPlan, ComplianceFlag, Listing, PhotoAnalysis } from "@curb/shared";
import { BUDGET } from "./budget.ts";
import type { ResultCache } from "./cache.ts";
import type { ModelClient, ModelImage } from "./model-client.ts";
import { analyzePhotos, type ListingPhoto } from "./steps/analyze-photos.ts";
import { checkCompliance } from "./steps/check-compliance.ts";
import { applyCritiqueFixes, critiqueSlides, type CritiqueRoundLog } from "./steps/critique.ts";
import { planCarousel } from "./steps/plan-carousel.ts";
import type { Usage } from "./structured.ts";

export interface RenderedSlide {
  png: Uint8Array;
  /** Text boxes whose content doesn't fit. Must be empty (CLAUDE.md rule 7). */
  overflow: string[];
}

/**
 * Step 3, injected so the pipeline stays testable without a browser. Renders the slides at
 * `only` (all slides when omitted), returning them in that order.
 */
export type RenderCarousel = (input: {
  listing: Listing;
  plan: CarouselPlan;
  analyses: readonly PhotoAnalysis[];
  brandKit: BrandKit;
  only?: readonly number[];
}) => Promise<RenderedSlide[]>;

/** Turns a rendered PNG into a downscaled image for the model (injected: image I/O lives in the server). */
export type PrepareSlideImage = (png: Uint8Array) => Promise<ModelImage>;

export type ProgressEvent =
  | { step: "photo-analysis"; file: string; fromCache: boolean; done: number; total: number }
  | { step: "carousel-plan"; status: "started" | "done" }
  | { step: "render"; status: "started" | "done"; slides: number }
  | { step: "critique"; status: "started" | "done"; round: number; changes?: number }
  | { step: "compliance"; status: "started" | "done"; flags?: number };

export interface GenerateCarouselInput {
  client: ModelClient;
  listing: Listing;
  photos: readonly ListingPhoto[];
  brandKit: BrandKit;
  render: RenderCarousel;
  prepareSlideImage: PrepareSlideImage;
  cache?: ResultCache;
  /** Defaults to BUDGET.maxCritiqueRounds; capped by it. */
  critiqueRounds?: number;
  onProgress?: (event: ProgressEvent) => void;
}

export interface CarouselResult {
  /** Photo analyses, with any focal points the critique changed. */
  analyses: PhotoAnalysis[];
  plan: CarouselPlan;
  slides: RenderedSlide[];
  critique: CritiqueRoundLog[];
  flags: ComplianceFlag[];
  usage: Usage;
}

/**
 * Steps 1–4: photo analysis → carousel plan → render → critique rounds (re-rendering only the
 * slides that changed) → compliance check on the final copy. Step 5 (human review) is the UI.
 */
export async function generateCarousel(input: GenerateCarouselInput): Promise<CarouselResult> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const emit = (e: ProgressEvent) => input.onProgress?.(e);
  let done = 0;

  let analyses = await analyzePhotos({
    client: input.client,
    photos: input.photos,
    usage,
    ...(input.cache ? { cache: input.cache } : {}),
    onPhotoDone: (file, fromCache) =>
      emit({ step: "photo-analysis", file, fromCache, done: ++done, total: input.photos.length }),
  });

  emit({ step: "carousel-plan", status: "started" });
  let plan = await planCarousel({ client: input.client, listing: input.listing, analyses, usage });
  emit({ step: "carousel-plan", status: "done" });

  const render = async (only?: readonly number[]) => {
    const count = only?.length ?? plan.slides.length;
    emit({ step: "render", status: "started", slides: count });
    const rendered = await input.render({
      listing: input.listing,
      plan,
      analyses,
      brandKit: input.brandKit,
      ...(only ? { only } : {}),
    });
    emit({ step: "render", status: "done", slides: count });
    return rendered;
  };
  let slides = await render();

  const critique: CritiqueRoundLog[] = [];
  const rounds = Math.min(
    input.critiqueRounds ?? BUDGET.maxCritiqueRounds,
    BUDGET.maxCritiqueRounds,
  );
  for (let round = 1; round <= rounds; round++) {
    emit({ step: "critique", status: "started", round });
    const result = await critiqueSlides({
      client: input.client,
      listing: input.listing,
      plan,
      analyses,
      slideImages: await Promise.all(slides.map((s) => input.prepareSlideImage(s.png))),
      overflow: slides.map((s) => s.overflow),
      usage,
    });
    const applied = applyCritiqueFixes(plan, analyses, result.fixes);
    critique.push({
      round,
      summary: result.summary,
      fixes: result.fixes,
      changes: applied.changes,
    });
    emit({ step: "critique", status: "done", round, changes: applied.changes.length });
    if (applied.changedSlides.length === 0) break;

    plan = applied.plan;
    analyses = applied.analyses;
    const rerendered = await render(applied.changedSlides);
    slides = slides.map((s, i) => {
      const at = applied.changedSlides.indexOf(i);
      return at === -1 ? s : (rerendered[at] ?? s);
    });
  }

  emit({ step: "compliance", status: "started" });
  const flags = await checkCompliance({ client: input.client, plan, usage });
  emit({ step: "compliance", status: "done", flags: flags.length });

  return { analyses, plan, slides, critique, flags, usage };
}
