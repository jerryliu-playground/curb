import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzePhotos, type ListingPhoto, planCarousel } from "@curb/pipeline";
import { createSampleModelClient, type SampleLabels } from "@curb/pipeline/testing";
import { ListingSchema } from "@curb/shared";

export const samplesDir = join(import.meta.dirname, "../../samples");

/** A sample listing planned with the deterministic mock client (no API calls). */
export async function plannedSample(id: string) {
  const dir = join(samplesDir, id);
  const read = (f: string): unknown => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const listing = ListingSchema.parse(read("listing.json"));
  const labels = read("labels.json") as SampleLabels;
  const photos: ListingPhoto[] = labels.photos.map((p) => ({
    file: p.file,
    image: { mediaType: "image/jpeg", base64: p.file },
  }));
  const client = createSampleModelClient({ listing, labels });
  const analyses = await analyzePhotos({ client, photos });
  const plan = await planCarousel({ client, listing, analyses });
  return { dir, listing, analyses, plan };
}
