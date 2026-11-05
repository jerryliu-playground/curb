import type { CarouselPlan, PhotoAnalysis, UnsupportedClaim } from "@curb/shared";
import { slidePhotos } from "@curb/shared";

/**
 * Where an unsupported claim came from. The judge checks copy against the golden labels, so a
 * claim can be "unsupported" for two different reasons:
 * - the photo analysis said it: either the labels miss something that is really in the photo, or
 *   the analysis saw something that isn't there. A person has to look at the photo.
 * - nothing upstream said it: the plan step invented it. This is the worst case.
 */
export interface ClaimCheck {
  claim: UnsupportedClaim;
  /** Photo-analysis features that back the claim, as "<feature> (<file>)"; empty when none do. */
  fromPhotoAnalysis: string[];
}

/** Share of a claim's content words that must appear in the photo analysis to count as from it. */
export const CLAIM_MATCH_THRESHOLD = 0.6;

const STOP_WORDS = new Set(
  "a an the of with and or in on at to for from by its it is are into onto over under near beside both".split(
    " ",
  ),
);

/** Lowercase content words, with a light plural strip so "doors" matches "door". */
export function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => !STOP_WORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/**
 * Classifies each claim by whether the photo analysis of the photos it describes contains it.
 * A slide's claims are matched against that slide's photos; caption and hashtag claims against
 * every photo. This is a word-overlap heuristic, so the report calls the result "likely".
 */
export function classifyClaims(
  claims: readonly UnsupportedClaim[],
  plan: CarouselPlan,
  analyses: readonly PhotoAnalysis[],
): ClaimCheck[] {
  const byFile = new Map(analyses.map((a) => [a.file, a]));

  return claims.map((claim) => {
    const slide = claim.location.slide === null ? undefined : plan.slides[claim.location.slide];
    const files = slide ? slidePhotos(slide) : analyses.map((a) => a.file);
    const features = files.flatMap((file) =>
      (byFile.get(file)?.keyFeatures ?? []).map((text) => ({
        label: `${text} (${file})`,
        words: new Set(contentWords(text)),
      })),
    );

    const words = [...new Set(contentWords(claim.claim))];
    if (words.length === 0) return { claim, fromPhotoAnalysis: [] };
    const covered = words.filter((w) => features.some((f) => f.words.has(w)));
    if (covered.length / words.length < CLAIM_MATCH_THRESHOLD)
      return { claim, fromPhotoAnalysis: [] };

    const overlap = (f: (typeof features)[number]) => words.filter((w) => f.words.has(w)).length;
    const backing = features
      .filter((f) => overlap(f) > 0)
      .sort((a, b) => overlap(b) - overlap(a))
      .slice(0, 2)
      .map((f) => f.label);
    return { claim, fromPhotoAnalysis: backing };
  });
}
