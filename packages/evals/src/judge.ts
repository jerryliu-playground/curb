import {
  BUDGET,
  fillPrompt,
  generateValidated,
  loadPrompt,
  type ModelClient,
  type Usage,
} from "@curb/pipeline";
import type { SampleLabels } from "@curb/pipeline/testing";
import {
  type CarouselPlan,
  type JudgeVerdict,
  JudgeVerdictSchema,
  type Listing,
  listingFacts,
  locationKey,
  locationLabel,
  planCopy,
  slidePhotos,
} from "@curb/shared";

export const EVAL_JUDGE_PROMPT = { name: "eval-judge", version: 1 } as const;

/**
 * LLM-as-judge (SPEC.md §5, Phase 3): grades headline quality, accuracy against the listing
 * facts and the golden photo labels, and brand voice, using the rubric in the prompt file.
 * Unsupported claims must quote text that exists at their location, and the accuracy score must
 * agree with the claim list, so the judge can't point at nothing or contradict itself.
 */
export async function judgeCarousel(input: {
  client: ModelClient;
  listing: Listing;
  labels: SampleLabels;
  plan: CarouselPlan;
  usage?: Usage;
}): Promise<JudgeVerdict> {
  const { plan } = input;
  const prompt = loadPrompt(EVAL_JUDGE_PROMPT.name, EVAL_JUDGE_PROMPT.version);
  const copy = planCopy(plan);
  const byLocation = new Map(copy.map((c) => [locationKey(c.location), c.text.toLowerCase()]));
  const roomOf = new Map(input.labels.photos.map((p) => [p.file, p.room_type]));

  const slides = plan.slides.map((slide, i) => ({
    slide: i,
    number: i + 1,
    type: slide.type,
    photos: slidePhotos(slide).map((file) => ({ file, room_type: roomOf.get(file) ?? "unknown" })),
    headline: slide.headline,
    ...("body" in slide ? { body: slide.body } : {}),
    altText: slide.altText,
  }));

  return generateValidated(
    input.client,
    {
      step: "eval-judge",
      system: prompt.system,
      prompt: fillPrompt(prompt.user, {
        listing: JSON.stringify(listingFacts(input.listing), null, 2),
        labels: JSON.stringify(input.labels.photos, null, 2),
        slides: JSON.stringify(slides, null, 2),
        caption: plan.caption,
        hashtags: plan.hashtags.join(" "),
        locations: JSON.stringify(
          copy.map((c) => c.location),
          null,
          0,
        ),
      }),
      images: [],
      schema: JudgeVerdictSchema,
      maxTokens: BUDGET.evalJudge.maxTokens,
      effort: BUDGET.evalJudge.effort,
      meta: { listing: input.listing.id },
    },
    (verdict) => {
      const { score, unsupportedClaims } = verdict.accuracy;
      const problems = unsupportedClaims.flatMap((c) => {
        const text = byLocation.get(locationKey(c.location));
        if (text === undefined) return [`Claim location ${locationKey(c.location)} doesn't exist.`];
        if (!text.includes(c.claim.toLowerCase())) {
          return [
            `Claim "${c.claim}" doesn't appear in ${locationLabel(c.location)}; quote it exactly.`,
          ];
        }
        return [];
      });
      if (unsupportedClaims.length === 0 && score !== 5) {
        problems.push("accuracy.score must be 5 when unsupportedClaims is empty.");
      }
      if (unsupportedClaims.length > 0 && score === 5) {
        problems.push("accuracy.score can't be 5 when unsupportedClaims lists claims.");
      }
      return problems;
    },
    input.usage,
  );
}
