import { z } from "zod";
import { RoomTypeSchema } from "./listing.ts";

export const LIMITS = {
  keyFeatureChars: 60,
  maxKeyFeatures: 8,
  headlineChars: 40,
  bodyChars: 140,
  ctaBodyChars: 100,
  altTextChars: 200,
  captionChars: 1000,
  minSlides: 6,
  maxSlides: 10,
  minHashtags: 5,
  maxHashtags: 15,
  hashtagChars: 30,
} as const;

/**
 * What the model returns for one photo. Objects are strict and non-recursive so the schema
 * works with JSON outputs; numeric and length limits are checked by zod after the response
 * (ADR 0007).
 */
export const PhotoAnalysisOutputSchema = z.strictObject({
  roomType: RoomTypeSchema,
  keyFeatures: z
    .array(z.string().min(1).max(LIMITS.keyFeatureChars))
    .min(1)
    .max(LIMITS.maxKeyFeatures)
    .describe("Concrete features clearly visible in the photo. No guesses."),
  qualityScore: z.number().int().min(1).max(5).describe("Photo quality: 1 poor, 5 excellent."),
  heroScore: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("How well the photo works as the carousel cover: 1 poor, 5 excellent."),
  focalPoint: z
    .strictObject({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
    .describe("Centre of the most important subject, as fractions of width and height."),
});
export type PhotoAnalysisOutput = z.infer<typeof PhotoAnalysisOutputSchema>;

/** Photo analysis for one photo of a listing. */
export type PhotoAnalysis = PhotoAnalysisOutput & { file: string };
