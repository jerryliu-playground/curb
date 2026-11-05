import type { CarouselResult } from "@curb/pipeline";
import type { SampleLabels } from "@curb/pipeline/testing";
import { CarouselPlanSchema, checkCarouselPlan, slidePhotos } from "@curb/shared";
import type { DeterministicScores } from "./types.ts";

// checkCarouselPlan also reports reuse; it's counted separately in `reusedPhotos`.
const REUSE_PROBLEM = "use each photo at most once";

/**
 * The deterministic half of the eval (SPEC.md §5, Phase 3): overflow, character limits, slide
 * and hashtag counts, compliance flags, photo reuse, and photo-analysis room types against the
 * golden labels.
 */
export function scoreDeterministic(input: {
  result: Pick<CarouselResult, "plan" | "analyses" | "flags" | "critique">;
  labels: SampleLabels;
  photoFiles: readonly string[];
  overflow: Record<string, string[]>;
}): DeterministicScores {
  const { plan, analyses, flags, critique } = input.result;

  const parsed = CarouselPlanSchema.safeParse(plan);
  const schemaProblems = parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  const ruleProblems = [
    ...schemaProblems,
    ...checkCarouselPlan(plan, input.photoFiles).filter((p) => !p.includes(REUSE_PROBLEM)),
  ];

  const uses = new Map<string, number>();
  for (const slide of plan.slides) {
    for (const file of slidePhotos(slide)) uses.set(file, (uses.get(file) ?? 0) + 1);
  }
  const reusedPhotos = [...uses].filter(([, n]) => n > 1).map(([file]) => file);

  const labelled = new Map(input.labels.photos.map((p) => [p.file, p.room_type]));
  const mismatches: string[] = [];
  let correct = 0;
  let total = 0;
  for (const a of analyses) {
    const expected = labelled.get(a.file);
    if (expected === undefined) continue;
    total++;
    if (a.roomType === expected) correct++;
    else mismatches.push(`${a.file}: labelled ${expected}, analysed ${a.roomType}`);
  }

  return {
    slideCount: plan.slides.length,
    hashtagCount: plan.hashtags.length,
    overflow: input.overflow,
    ruleProblems,
    reusedPhotos,
    complianceFlags: {
      wordList: flags.filter((f) => f.source === "word-list").length,
      model: flags.filter((f) => f.source === "model").length,
    },
    roomTypes: { correct, total, mismatches },
    critique: {
      rounds: critique.length,
      changes: critique.reduce((n, round) => n + round.changes.length, 0),
    },
  };
}

/** True when nothing deterministic is wrong: no overflow, no rule problems, no reused photos. */
export function passesDeterministic(scores: DeterministicScores): boolean {
  return (
    Object.values(scores.overflow).every((boxes) => boxes.length === 0) &&
    scores.ruleProblems.length === 0 &&
    scores.reusedPhotos.length === 0
  );
}
