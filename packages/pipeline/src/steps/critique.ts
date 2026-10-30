import {
  type CarouselPlan,
  CarouselPlanSchema,
  checkCarouselPlan,
  type Critique,
  type CritiqueFix,
  CritiqueSchema,
  type Listing,
  listingFacts,
  type PhotoAnalysis,
  slidePhotos,
} from "@curb/shared";
import { BUDGET } from "../budget.ts";
import type { ModelClient, ModelImage } from "../model-client.ts";
import { fillPrompt, loadPrompt } from "../prompts.ts";
import { generateValidated, type Usage } from "../structured.ts";

export const CRITIQUE_PROMPT = { name: "critique", version: 1 } as const;

export interface PlanChange {
  slide: number;
  field: "headline" | "body" | "photo" | "focalPoint";
  from: string;
  to: string;
}

export interface CritiqueRoundLog {
  round: number;
  summary: string;
  fixes: CritiqueFix[];
  changes: PlanChange[];
}

export interface AppliedFixes {
  plan: CarouselPlan;
  analyses: PhotoAnalysis[];
  changes: PlanChange[];
  /** Slides whose render is out of date. */
  changedSlides: number[];
  problems: string[];
}

const point = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

/**
 * Applies critique fixes to copies of the plan and analyses. `problems` lists fixes that can't
 * be applied or that would break the plan; the caller sends them back to the model.
 */
export function applyCritiqueFixes(
  plan: CarouselPlan,
  analyses: readonly PhotoAnalysis[],
  fixes: readonly CritiqueFix[],
): AppliedFixes {
  const next = structuredClone(plan);
  const nextAnalyses = analyses.map((a) => ({ ...a, focalPoint: { ...a.focalPoint } }));
  const changes: PlanChange[] = [];
  const changed = new Set<number>();
  const problems: string[] = [];
  const refocused = new Set<string>();

  for (const fix of fixes) {
    const slide = next.slides[fix.slide];
    if (!slide) {
      problems.push(`Fix for slide ${fix.slide}: there is no such slide.`);
      continue;
    }
    if (fix.headline !== null && fix.headline !== slide.headline) {
      changes.push({ slide: fix.slide, field: "headline", from: slide.headline, to: fix.headline });
      slide.headline = fix.headline;
    }
    if (fix.body !== null) {
      if (!("body" in slide)) problems.push(`Slide ${fix.slide} (${slide.type}) has no body.`);
      else if (fix.body !== slide.body) {
        changes.push({ slide: fix.slide, field: "body", from: slide.body, to: fix.body });
        slide.body = fix.body;
      }
    }
    if (fix.photo !== null) {
      if (slide.type === "gallery")
        problems.push(`Slide ${fix.slide} is a gallery; its photos can't change.`);
      else if (fix.photo !== slide.photo) {
        changes.push({
          slide: fix.slide,
          field: "photo",
          from: slide.photo ?? "none",
          to: fix.photo,
        });
        slide.photo = fix.photo;
      }
    }
    if (fix.focalPoint !== null) {
      const [file] = slidePhotos(slide);
      const analysis = nextAnalyses.find((a) => a.file === file);
      if (!analysis) problems.push(`Slide ${fix.slide} has no photo to refocus.`);
      else {
        changes.push({
          slide: fix.slide,
          field: "focalPoint",
          from: point(analysis.focalPoint),
          to: point(fix.focalPoint),
        });
        analysis.focalPoint = fix.focalPoint;
        refocused.add(analysis.file);
      }
    }
    if (changes.some((c) => c.slide === fix.slide)) changed.add(fix.slide);
  }

  const parsed = CarouselPlanSchema.safeParse(next);
  if (!parsed.success)
    problems.push(...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  problems.push(
    ...checkCarouselPlan(
      next,
      analyses.map((a) => a.file),
    ),
  );

  // A refocused photo changes every slide that shows it.
  next.slides.forEach((s, i) => {
    if (slidePhotos(s).some((file) => refocused.has(file))) changed.add(i);
  });
  return {
    plan: next,
    analyses: nextAnalyses,
    changes,
    changedSlides: [...changed].sort((a, b) => a - b),
    problems,
  };
}

export interface CritiqueInput {
  client: ModelClient;
  listing: Listing;
  plan: CarouselPlan;
  analyses: readonly PhotoAnalysis[];
  /** One downscaled image per rendered slide, in order. */
  slideImages: readonly ModelImage[];
  /** Measured overflow per slide (from the renderer). */
  overflow: readonly (readonly string[])[];
  usage?: Usage;
}

/** One critique round: the model reviews the rendered slides and proposes fixes. */
export async function critiqueSlides(input: CritiqueInput): Promise<Critique> {
  const prompt = loadPrompt(CRITIQUE_PROMPT.name, CRITIQUE_PROMPT.version);
  const overflow = input.overflow.flatMap((list, i) => list.map((o) => `- slide ${i}: ${o}`));

  return generateValidated(
    input.client,
    {
      step: "critique",
      system: prompt.system,
      prompt: fillPrompt(prompt.user, {
        overflow: overflow.length > 0 ? overflow.join("\n") : "none",
        plan: JSON.stringify(input.plan, null, 2),
        listing: JSON.stringify(listingFacts(input.listing), null, 2),
        analyses: JSON.stringify(input.analyses, null, 2),
      }),
      images: input.slideImages,
      schema: CritiqueSchema,
      maxTokens: BUDGET.critique.maxTokens,
      effort: BUDGET.critique.effort,
    },
    (critique) => applyCritiqueFixes(input.plan, input.analyses, critique.fixes).problems,
    input.usage,
  );
}
