import { z } from "zod";
import { LIMITS } from "./photo-analysis.ts";
import { COMPLIANCE_GROUNDS, CopyLocationSchema } from "./compliance.ts";

/** What the model returns from the compliance check (merged with the word list afterwards). */
export const ComplianceReviewSchema = z.strictObject({
  flags: z.array(
    z.strictObject({
      location: CopyLocationSchema,
      phrase: z.string().min(1).max(80).describe("The exact words as they appear in the copy."),
      ground: z.enum(COMPLIANCE_GROUNDS),
      reason: z.string().min(1).max(200),
      suggestion: z.string().min(1).max(200).describe("A neutral rewrite or what to remove."),
    }),
  ),
});
export type ComplianceReview = z.infer<typeof ComplianceReviewSchema>;

export const CRITIQUE_CHECKS = [
  "fit",
  "legibility",
  "focal-point",
  "headline-photo-match",
  "brand-consistency",
] as const;

/** What the model returns for one critique round (SPEC.md §4, step 4). */
export const CritiqueSchema = z.strictObject({
  summary: z.string().min(1).max(300),
  fixes: z
    .array(
      z.strictObject({
        slide: z.number().int().min(0).describe("0-based slide index."),
        check: z.enum(CRITIQUE_CHECKS),
        problem: z.string().min(1).max(200),
        headline: z.string().min(1).max(LIMITS.headlineChars).nullable(),
        body: z.string().min(1).max(LIMITS.bodyChars).nullable(),
        photo: z.string().min(1).nullable().describe("Replacement photo file name, or null."),
        focalPoint: z
          .strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
          .nullable()
          .describe("New focal point for the slide's photo, or null."),
      }),
    )
    .describe("Only slides that need a change. Empty when everything passes."),
});
export type Critique = z.infer<typeof CritiqueSchema>;
export type CritiqueFix = Critique["fixes"][number];
