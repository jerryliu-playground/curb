import type { BrandKit, CarouselPlan, Listing, PhotoAnalysis } from "@curb/shared";
import type { ResultCache } from "./cache.ts";
import type { ModelClient } from "./model-client.ts";
import { analyzePhotos, type ListingPhoto } from "./steps/analyze-photos.ts";
import { planCarousel } from "./steps/plan-carousel.ts";
import type { Usage } from "./structured.ts";

export interface RenderedSlide {
  png: Uint8Array;
  /** Text boxes whose content doesn't fit. Must be empty (CLAUDE.md rule 7). */
  overflow: string[];
}

/** Step 3, injected so the pipeline stays testable without a browser. */
export type RenderCarousel = (input: {
  listing: Listing;
  plan: CarouselPlan;
  analyses: readonly PhotoAnalysis[];
  brandKit: BrandKit;
}) => Promise<RenderedSlide[]>;

export type ProgressEvent =
  | { step: "photo-analysis"; file: string; fromCache: boolean; done: number; total: number }
  | { step: "carousel-plan"; status: "started" | "done" }
  | { step: "render"; status: "started" | "done" };

export interface GenerateCarouselInput {
  client: ModelClient;
  listing: Listing;
  photos: readonly ListingPhoto[];
  brandKit: BrandKit;
  render: RenderCarousel;
  cache?: ResultCache;
  onProgress?: (event: ProgressEvent) => void;
}

export interface CarouselResult {
  analyses: PhotoAnalysis[];
  plan: CarouselPlan;
  slides: RenderedSlide[];
  usage: Usage;
}

/** Steps 1–3: photo analysis → carousel plan → render. Critique (step 4) comes in Phase 2. */
export async function generateCarousel(input: GenerateCarouselInput): Promise<CarouselResult> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let done = 0;

  const analyses = await analyzePhotos({
    client: input.client,
    photos: input.photos,
    usage,
    ...(input.cache ? { cache: input.cache } : {}),
    onPhotoDone: (file, fromCache) =>
      input.onProgress?.({
        step: "photo-analysis",
        file,
        fromCache,
        done: ++done,
        total: input.photos.length,
      }),
  });

  input.onProgress?.({ step: "carousel-plan", status: "started" });
  const plan = await planCarousel({
    client: input.client,
    listing: input.listing,
    analyses,
    usage,
  });
  input.onProgress?.({ step: "carousel-plan", status: "done" });

  input.onProgress?.({ step: "render", status: "started" });
  const slides = await input.render({
    listing: input.listing,
    plan,
    analyses,
    brandKit: input.brandKit,
  });
  input.onProgress?.({ step: "render", status: "done" });

  return { analyses, plan, slides, usage };
}
