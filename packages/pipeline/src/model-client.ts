import type { z } from "zod";

export type PipelineStep = "photo-analysis" | "carousel-plan";
export type Effort = "low" | "medium" | "high";

export interface ModelImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64-encoded image bytes, already downscaled (see BUDGET.maxImageEdgePx). */
  base64: string;
}

export interface ModelRequest {
  step: PipelineStep;
  system: string;
  prompt: string;
  images: readonly ModelImage[];
  /** Shape the model must return. The client constrains output with it (ADR 0007). */
  schema: z.ZodType;
  maxTokens: number;
  effort: Effort;
  /** Non-sensitive context for mocks and logs, e.g. the photo file name. */
  meta?: Record<string, string>;
}

export interface ModelResponse {
  /** Parsed JSON as returned by the model. Not yet validated: the pipeline validates it. */
  output: unknown;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * The only way pipeline code talks to a model (ADR 0006). The real implementation lives in
 * apps/server; tests use the mocks in `@curb/pipeline/testing`.
 */
export interface ModelClient {
  /** Identifies the model behind the client; part of every cache key. */
  readonly id: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

/** The model stopped without a usable answer (refusal, max_tokens, unparseable JSON). */
export class ModelResponseError extends Error {
  override name = "ModelResponseError";
}
