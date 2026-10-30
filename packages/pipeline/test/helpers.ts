import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Listing, ListingSchema } from "@curb/shared";
import type { ListingPhoto } from "../src/index.ts";
import type { SampleLabels } from "../src/testing/index.ts";

export const samplesDir = join(import.meta.dirname, "../../../samples");
export const sampleIds = readdirSync(samplesDir).filter((d) => /^\d+$/.test(d));

export function loadSample(id: string): {
  listing: Listing;
  labels: SampleLabels;
  photos: ListingPhoto[];
} {
  const read = (f: string): unknown => JSON.parse(readFileSync(join(samplesDir, id, f), "utf8"));
  const labels = read("labels.json") as SampleLabels;
  return {
    listing: ListingSchema.parse(read("listing.json")),
    labels,
    // Tests never send images anywhere, so a stand-in payload per file is enough.
    photos: labels.photos.map((p) => ({
      file: p.file,
      image: { mediaType: "image/jpeg", base64: `img:${p.file}` },
    })),
  };
}
