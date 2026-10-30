import { join } from "node:path";
import { createSampleModelClient } from "@curb/pipeline/testing";
import { DEMO_BRAND_KIT } from "@curb/templates";
import type { ServerConfig } from "./config.ts";
import { fileCache } from "./io/file-cache.ts";
import { loadPhotosForModel, slideImageForModel } from "./io/photos.ts";
import { JobService } from "./jobs.ts";
import { createAnthropicModelClient } from "./model/anthropic-client.ts";
import { RenderService } from "./render-service.ts";
import { loadSampleLabels } from "./samples.ts";

export interface Services {
  config: ServerConfig;
  jobs: JobService;
  close: () => Promise<void>;
}

export function createServices(config: ServerConfig): Services {
  const renderService = new RenderService();
  const apiKey = config.anthropicApiKey;
  const jobs = new JobService({
    render: (input) => renderService.render(input),
    createClient: async (sample) =>
      config.model === "anthropic" && apiKey
        ? createAnthropicModelClient({ apiKey, debug: config.debug })
        : createSampleModelClient({
            listing: sample.listing,
            labels: await loadSampleLabels(sample),
          }),
    loadPhotos: (sample) => loadPhotosForModel(sample.dir, sample.photos),
    prepareSlideImage: slideImageForModel,
    brandKit: DEMO_BRAND_KIT,
    cache: fileCache(join(config.cacheDir, "photo-analysis")),
  });
  return { config, jobs, close: () => renderService.close() };
}
