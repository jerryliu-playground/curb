import { CarouselPlanSchema, checkCarouselPlan } from "@curb/shared";
import { describe, expect, it } from "vitest";
import {
  analyzePhotos,
  BUDGET,
  generateCarousel,
  loadPrompt,
  memoryCache,
  planCarousel,
  type ModelClient,
} from "../src/index.ts";
import { createSampleModelClient, createScriptedModelClient } from "../src/testing/index.ts";
import { loadSample, sampleIds } from "./helpers.ts";

const sample = loadSample("01");

function counting(client: ModelClient) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    client: {
      ...client,
      generate: (r: Parameters<ModelClient["generate"]>[0]) => (calls++, client.generate(r)),
    },
  };
}

describe("prompts", () => {
  it.each([
    ["photo-analysis", 1],
    ["carousel-plan", 1],
  ] as const)("%s v%d has system and user sections", (name, version) => {
    const prompt = loadPrompt(name, version);
    expect(prompt.system.length).toBeGreaterThan(50);
    expect(prompt.user.length).toBeGreaterThan(50);
  });
});

describe("analyzePhotos", () => {
  it("sends one image per request within budget", async () => {
    const real = createSampleModelClient(sample);
    const spy = createScriptedModelClient(() => null);
    const client: ModelClient = {
      id: real.id,
      generate: async (req) => (await spy.generate(req), real.generate(req)),
    };
    const analyses = await analyzePhotos({ client, photos: sample.photos });
    expect(analyses.map((a) => a.file)).toEqual(sample.photos.map((p) => p.file));
    expect(spy.calls).toHaveLength(sample.photos.length);
    for (const call of spy.calls) {
      expect(call.images).toHaveLength(1);
      expect(call.maxTokens).toBe(BUDGET.photoAnalysis.maxTokens);
    }
  });

  it("caches by image, prompt version and model", async () => {
    const cache = memoryCache();
    const first = counting(createSampleModelClient(sample));
    await analyzePhotos({ client: first.client, photos: sample.photos, cache });
    expect(first.calls).toBe(sample.photos.length);

    const again = counting(createSampleModelClient(sample));
    await analyzePhotos({ client: again.client, photos: sample.photos, cache });
    expect(again.calls).toBe(0);

    const otherModel = counting({ ...createSampleModelClient(sample), id: "mock:other" });
    await analyzePhotos({ client: otherModel.client, photos: sample.photos, cache });
    expect(otherModel.calls).toBe(sample.photos.length);
  });
});

describe("planCarousel", () => {
  it("retries when the plan reuses a photo, then accepts the fix", async () => {
    const good = await createSampleModelClient(sample).generate({
      step: "carousel-plan",
      system: "",
      prompt: "",
      images: [],
      schema: CarouselPlanSchema,
      maxTokens: 1,
      effort: "low",
    });
    const plan = CarouselPlanSchema.parse(good.output);
    const broken = structuredClone(plan);
    const second = broken.slides[1];
    if (second && second.type !== "gallery")
      second.photo = plan.slides[0]?.type === "cover" ? plan.slides[0].photo : null;

    const client = createScriptedModelClient((_r, i) => (i === 0 ? broken : plan));
    const analyses = await analyzePhotos({
      client: createSampleModelClient(sample),
      photos: sample.photos,
    });
    await expect(planCarousel({ client, listing: sample.listing, analyses })).resolves.toEqual(
      plan,
    );
    expect(client.calls[1]?.prompt).toMatch(/is used 2 times/);
  });

  it("never sends owner-only review notes to the model", async () => {
    const analyses = await analyzePhotos({
      client: createSampleModelClient(sample),
      photos: sample.photos,
    });
    const spy = createScriptedModelClient(() => {
      throw new Error("stop after recording the request");
    });
    await planCarousel({ client: spy, listing: sample.listing, analyses }).catch(() => undefined);
    expect(spy.calls[0]?.prompt).not.toContain("review_notes");
    expect(spy.calls[0]?.prompt).toContain(sample.listing.address.street);
  });
});

describe("sample model client", () => {
  it.each(sampleIds)("sample %s produces a valid plan", async (id) => {
    const s = loadSample(id);
    const analyses = await analyzePhotos({ client: createSampleModelClient(s), photos: s.photos });
    const plan = await planCarousel({
      client: createSampleModelClient(s),
      listing: s.listing,
      analyses,
    });
    expect(
      checkCarouselPlan(
        plan,
        s.photos.map((p) => p.file),
      ),
    ).toEqual([]);
  });
});

describe("generateCarousel", () => {
  it("runs analysis, plan and render in order and reports progress", async () => {
    const events: string[] = [];
    const result = await generateCarousel({
      client: createSampleModelClient(sample),
      listing: sample.listing,
      photos: sample.photos,
      brandKit: {
        agentName: "A",
        brokerage: "B",
        phone: "1",
        email: "a@b.co",
        colors: { primary: "#000000", accent: "#ffffff", background: "#ffffff", text: "#000000" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      render: ({ plan }) =>
        Promise.resolve(plan.slides.map(() => ({ png: new Uint8Array(), overflow: [] }))),
      prepareSlideImage: () => Promise.resolve({ mediaType: "image/png", base64: "" }),
      onProgress: (e) => events.push(e.step),
    });
    expect(result.slides).toHaveLength(result.plan.slides.length);
    expect(events.indexOf("carousel-plan")).toBeGreaterThan(events.lastIndexOf("photo-analysis"));
    expect(events.at(-1)).toBe("compliance");
    expect(result.critique).toHaveLength(1);
  });
});
