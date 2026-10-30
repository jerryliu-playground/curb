import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SampleLabels } from "@curb/pipeline/testing";
import { type Listing, ListingSchema } from "@curb/shared";
import { listPhotoFiles } from "./io/photos.ts";

export interface SampleListing {
  id: string;
  dir: string;
  listing: Listing;
  photos: string[];
}

const SAMPLE_ID = /^[0-9]{2,}$/;

export async function listSamples(samplesDir: string): Promise<SampleListing[]> {
  const ids = (await readdir(samplesDir)).filter((d) => SAMPLE_ID.test(d)).sort();
  return Promise.all(ids.map((id) => loadSample(samplesDir, id)));
}

export async function loadSample(samplesDir: string, id: string): Promise<SampleListing> {
  if (!SAMPLE_ID.test(id)) throw new Error(`Unknown sample "${id}".`);
  const dir = join(samplesDir, id);
  const listing = ListingSchema.parse(
    JSON.parse(await readFile(join(dir, "listing.json"), "utf8")),
  );
  return { id, dir, listing, photos: await listPhotoFiles(dir) };
}

export async function loadSampleLabels(sample: SampleListing): Promise<SampleLabels> {
  return JSON.parse(await readFile(join(sample.dir, "labels.json"), "utf8")) as SampleLabels;
}
