import { z } from "zod";
import { CopyLocationSchema } from "./compliance.ts";

/**
 * What the eval judge returns for one carousel (Phase 3, `pnpm eval`). Scores are 1–5 against
 * the rubric in `packages/pipeline/prompts/eval-judge.v1.md`.
 */
const score = z.number().int().min(1).max(5);
const reason = z.string().min(1).max(600);

export const JudgeVerdictSchema = z.strictObject({
  headlineQuality: z.strictObject({ score, reason }),
  accuracy: z.strictObject({
    score,
    reason,
    unsupportedClaims: z
      .array(
        z.strictObject({
          location: CopyLocationSchema,
          claim: z
            .string()
            .min(1)
            .max(200)
            .describe("The claim quoted exactly as it appears at the location."),
          why: z.string().min(1).max(300),
        }),
      )
      .max(30)
      .describe("Every claim the listing facts and the photo labels don't support."),
  }),
  brandVoice: z.strictObject({ score, reason }),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
export type UnsupportedClaim = JudgeVerdict["accuracy"]["unsupportedClaims"][number];
