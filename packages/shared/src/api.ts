import { z } from "zod";
import type { CarouselPlan } from "./carousel.ts";
import type { ComplianceFlag } from "./compliance.ts";
import type { Listing, RoomType } from "./listing.ts";
import { LIMITS } from "./photo-analysis.ts";

// HTTP contract between apps/web and apps/server. Request bodies are validated on the server.

export interface SampleSummary {
  id: string;
  street: string;
  city: string;
  priceCad: number;
  photoCount: number;
}

export const CreateJobRequestSchema = z.strictObject({
  sampleId: z.string().regex(/^[0-9]{2,}$/),
  template: z.string().min(1),
});
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const EditSlideRequestSchema = z
  .strictObject({
    headline: z.string().trim().min(1).max(LIMITS.headlineChars),
    body: z.string().trim().min(1).max(LIMITS.bodyChars),
    altText: z.string().trim().min(1).max(LIMITS.altTextChars),
    photo: z.string().min(1),
  })
  .partial();
export type EditSlideRequest = z.infer<typeof EditSlideRequestSchema>;

export const RegenerateSlideRequestSchema = z.strictObject({
  note: z.string().trim().max(300),
});
export type RegenerateSlideRequest = z.infer<typeof RegenerateSlideRequestSchema>;

export const EditCopyRequestSchema = z
  .strictObject({
    caption: z.string().trim().min(1).max(LIMITS.captionChars),
    hashtags: z
      .array(z.string().trim().min(2).max(LIMITS.hashtagChars))
      .min(LIMITS.minHashtags)
      .max(LIMITS.maxHashtags),
  })
  .partial();
export type EditCopyRequest = z.infer<typeof EditCopyRequestSchema>;

/** Approval must list every current flag id: proof the UI showed them (CLAUDE.md rule 8). */
export const ApproveRequestSchema = z.strictObject({
  shownFlagIds: z.array(z.string()),
});
export type ApproveRequest = z.infer<typeof ApproveRequestSchema>;

export interface PlanChangeView {
  slide: number;
  field: string;
  from: string;
  to: string;
}

export interface CritiqueRoundView {
  round: number;
  summary: string;
  changes: PlanChangeView[];
}

export type JobStatus = "running" | "ready" | "failed";

export interface JobView {
  id: string;
  sampleId: string;
  template: string;
  status: JobStatus;
  /** True while an edit or regenerate is in progress. */
  busy: boolean;
  error: string | null;
  progress: string[];
  listing: Omit<Listing, "review_notes" | "status">;
  plan: CarouselPlan | null;
  /** Bumped whenever a slide is re-rendered; use it to bust image caches. */
  slideVersions: number[];
  overflow: string[][];
  critique: CritiqueRoundView[];
  flags: ComplianceFlag[];
  photos: { file: string; roomType: RoomType }[];
  approval: { approvedAt: string; flagIds: string[] } | null;
}

export type JobEvent =
  | { type: "progress"; message: string }
  | { type: "updated" }
  | { type: "ready" }
  | { type: "failed"; error: string };
