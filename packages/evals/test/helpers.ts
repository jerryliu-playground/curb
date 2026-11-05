import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CarouselResult,
  generateCarousel,
  type ListingPhoto,
  type ModelClient,
} from "@curb/pipeline";
import { createSampleModelClient, type SampleLabels } from "@curb/pipeline/testing";
import { type BrandKit, type JudgeVerdict, type Listing, ListingSchema } from "@curb/shared";
import type { EvalRun, ListingEval } from "../src/index.ts";

// The render stub ignores the brand kit; any valid one will do.
const BRAND_KIT: BrandKit = {
  agentName: "Test Agent",
  brokerage: "Test Realty",
  phone: "416-555-0100",
  email: "agent@test.example",
  colors: { primary: "#111111", accent: "#222222", background: "#ffffff", text: "#000000" },
  fonts: { heading: "Inter", body: "Inter" },
};

const samplesDir = join(import.meta.dirname, "../../../samples");
export const sampleIds = readdirSync(samplesDir).filter((d) => /^\d+$/.test(d));

export function loadSample(id: string): {
  listing: Listing;
  labels: SampleLabels;
  photos: ListingPhoto[];
  files: string[];
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
    files: labels.photos.map((p) => p.file),
  };
}

/** Runs the real pipeline code with the mocked sample client and a render stub (no browser). */
export function generateWithMock(id: string, client?: ModelClient): Promise<CarouselResult> {
  const sample = loadSample(id);
  return generateCarousel({
    client: client ?? createSampleModelClient(sample),
    listing: sample.listing,
    photos: sample.photos,
    brandKit: BRAND_KIT,
    render: ({ plan, only }) =>
      Promise.resolve(
        (only ?? [...plan.slides.keys()]).map(() => ({ png: new Uint8Array(), overflow: [] })),
      ),
    prepareSlideImage: () => Promise.resolve({ mediaType: "image/png", base64: "slide" }),
  });
}

export function verdict(overrides: Partial<JudgeVerdict> = {}): JudgeVerdict {
  return {
    headlineQuality: { score: 4, reason: "Specific headlines." },
    accuracy: { score: 5, reason: "Everything is supported.", unsupportedClaims: [] },
    brandVoice: { score: 4, reason: "Plain and calm." },
    ...overrides,
  };
}

/** Overrides may set an optional field to undefined to remove it (exactOptionalPropertyTypes). */
type Overrides<T> = { [K in keyof T]?: T[K] | undefined };

function withOverrides<T extends object>(base: T, overrides: Overrides<T>): T {
  const result: Record<string, unknown> = { ...base, ...overrides };
  for (const [key, value] of Object.entries(overrides)) if (value === undefined) delete result[key];
  return result as T;
}

export function listingEval(overrides: Overrides<ListingEval> = {}): ListingEval {
  return withOverrides(
    {
      id: "01",
      title: "1 Test Street, Testville",
      status: "ok",
      durationMs: 1000,
      usage: { inputTokens: 1000, outputTokens: 100 },
      deterministic: {
        slideCount: 8,
        hashtagCount: 8,
        overflow: { modern: [] },
        ruleProblems: [],
        reusedPhotos: [],
        complianceFlags: { wordList: 0, model: 0 },
        roomTypes: {
          correct: 9,
          total: 10,
          mismatches: ["a.jpg: labelled kitchen, analysed dining_room"],
        },
        critique: { rounds: 1, changes: 0 },
      },
      judge: verdict(),
      judgeUsage: { inputTokens: 500, outputTokens: 50 },
    } satisfies ListingEval,
    overrides,
  );
}

export function evalRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    format: 1,
    id: "20261101-120000",
    startedAt: "2026-11-01T12:00:00.000Z",
    commit: "abc1234",
    mode: "real",
    model: "anthropic:claude-opus-5-5",
    judgeModel: "anthropic:claude-opus-5-5",
    prompts: { "carousel-plan": 1, "eval-judge": 1 },
    templates: ["modern"],
    listings: [listingEval()],
    ...overrides,
  };
}
