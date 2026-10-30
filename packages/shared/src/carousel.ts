import { z } from "zod";
import { LIMITS } from "./photo-analysis.ts";

export const SLIDE_TYPES = [
  "cover",
  "feature",
  "stats",
  "gallery",
  "neighbourhood",
  "cta",
] as const;
export const SlideTypeSchema = z.enum(SLIDE_TYPES);
export type SlideType = z.infer<typeof SlideTypeSchema>;

const photo = z.string().min(1).describe("File name of one of the listing's photos.");
const headline = z.string().min(1).max(LIMITS.headlineChars);
const body = z.string().min(1).max(LIMITS.bodyChars);
const altText = z
  .string()
  .min(1)
  .max(LIMITS.altTextChars)
  .describe("Alt text describing what the slide shows.");

// Optional fields are nullable rather than omitted: JSON outputs requires every property.
export const SlideSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("cover"), photo, headline, altText }),
  z.strictObject({ type: z.literal("feature"), photo, headline, body, altText }),
  z.strictObject({ type: z.literal("stats"), photo: photo.nullable(), headline, altText }),
  z.strictObject({
    type: z.literal("gallery"),
    photos: z.array(photo).min(2).max(3),
    headline,
    altText,
  }),
  z.strictObject({ type: z.literal("neighbourhood"), photo, headline, body, altText }),
  z.strictObject({
    type: z.literal("cta"),
    photo: photo.nullable(),
    headline,
    body: z.string().min(1).max(LIMITS.ctaBodyChars),
    altText,
  }),
]);
export type Slide = z.infer<typeof SlideSchema>;
export type SlideOf<T extends SlideType> = Extract<Slide, { type: T }>;

export const CarouselPlanSchema = z.strictObject({
  slides: z.array(SlideSchema).min(LIMITS.minSlides).max(LIMITS.maxSlides),
  caption: z.string().min(1).max(LIMITS.captionChars),
  hashtags: z
    .array(z.string().min(2).max(LIMITS.hashtagChars))
    .min(LIMITS.minHashtags)
    .max(LIMITS.maxHashtags),
});
export type CarouselPlan = z.infer<typeof CarouselPlanSchema>;

export function slidePhotos(slide: Slide): string[] {
  if (slide.type === "gallery") return slide.photos;
  return slide.photo === null ? [] : [slide.photo];
}

/**
 * Rules a JSON schema can't express. Returns human-readable problems (empty when valid);
 * these are sent back to the model on retry, so keep them specific.
 */
export function checkCarouselPlan(plan: CarouselPlan, photoFiles: readonly string[]): string[] {
  const problems: string[] = [];
  const known = new Set(photoFiles);
  const used = new Map<string, number>();
  const types = plan.slides.map((s) => s.type);

  if (types[0] !== "cover") problems.push("The first slide must be the cover.");
  if (types.at(-1) !== "cta") problems.push("The last slide must be the cta slide.");
  for (const t of ["cover", "cta"] as const) {
    const n = types.filter((x) => x === t).length;
    if (n !== 1) problems.push(`There must be exactly one ${t} slide (found ${n}).`);
  }
  if (types.filter((t) => t === "stats").length > 1) {
    problems.push("Use at most one stats slide.");
  }

  plan.slides.forEach((slide, i) => {
    for (const file of slidePhotos(slide)) {
      if (!known.has(file)) {
        problems.push(`Slide ${i + 1} uses "${file}", which is not one of the listing's photos.`);
      }
      used.set(file, (used.get(file) ?? 0) + 1);
    }
  });
  for (const [file, n] of used) {
    if (n > 1) problems.push(`Photo "${file}" is used ${n} times; use each photo at most once.`);
  }

  plan.hashtags.forEach((tag) => {
    if (!/^#[A-Za-z0-9]+$/.test(tag)) {
      problems.push(`Hashtag "${tag}" must be "#" followed by letters and digits only.`);
    }
  });
  if (new Set(plan.hashtags.map((t) => t.toLowerCase())).size !== plan.hashtags.length) {
    problems.push("Hashtags must not repeat.");
  }
  return problems;
}
