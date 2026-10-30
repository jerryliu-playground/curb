import { type PhotoAnalysis, PhotoAnalysisOutputSchema } from "@curb/shared";
import { BUDGET } from "../budget.ts";
import { type ResultCache, sha256 } from "../cache.ts";
import type { ModelClient, ModelImage } from "../model-client.ts";
import { loadPrompt } from "../prompts.ts";
import { generateValidated, type Usage } from "../structured.ts";

export const PHOTO_ANALYSIS_PROMPT = { name: "photo-analysis", version: 1 } as const;

export interface ListingPhoto {
  file: string;
  image: ModelImage;
}

export interface AnalyzePhotosInput {
  client: ModelClient;
  photos: readonly ListingPhoto[];
  cache?: ResultCache;
  usage?: Usage;
  onPhotoDone?: (file: string, fromCache: boolean) => void;
}

/** Step 1: one validated photo analysis per photo, cached by image hash + prompt + model. */
export async function analyzePhotos(input: AnalyzePhotosInput): Promise<PhotoAnalysis[]> {
  const prompt = loadPrompt(PHOTO_ANALYSIS_PROMPT.name, PHOTO_ANALYSIS_PROMPT.version);
  const results: PhotoAnalysis[] = new Array<PhotoAnalysis>(input.photos.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < input.photos.length) {
      const index = next++;
      const photo = input.photos[index];
      if (!photo) return;
      const key = `photo-analysis:v${prompt.version}:${input.client.id}:${sha256(photo.image.base64)}`;

      const cached = PhotoAnalysisOutputSchema.safeParse(await input.cache?.get(key));
      if (cached.success) {
        results[index] = { file: photo.file, ...cached.data };
        input.onPhotoDone?.(photo.file, true);
        continue;
      }

      const output = await generateValidated(
        input.client,
        {
          step: "photo-analysis",
          system: prompt.system,
          prompt: prompt.user,
          images: [photo.image],
          schema: PhotoAnalysisOutputSchema,
          maxTokens: BUDGET.photoAnalysis.maxTokens,
          effort: BUDGET.photoAnalysis.effort,
          meta: { photo: photo.file },
        },
        undefined,
        input.usage,
      );
      await input.cache?.set(key, output);
      results[index] = { file: photo.file, ...output };
      input.onPhotoDone?.(photo.file, false);
    }
  }

  const workers = Math.min(BUDGET.photoAnalysisConcurrency, input.photos.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
