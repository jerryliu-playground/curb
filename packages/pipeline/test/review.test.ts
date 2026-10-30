import { type CarouselPlan, CarouselPlanSchema, type CritiqueFix } from "@curb/shared";
import { describe, expect, it } from "vitest";
import {
  analyzePhotos,
  applyCritiqueFixes,
  checkCompliance,
  generateCarousel,
  type ModelRequest,
  planCarousel,
  regenerateSlide,
} from "../src/index.ts";
import { createSampleModelClient, createScriptedModelClient } from "../src/testing/index.ts";
import { loadSample } from "./helpers.ts";

const sample = loadSample("01");
const base = createSampleModelClient(sample);
const analyses = await analyzePhotos({ client: base, photos: sample.photos });
const plan = await planCarousel({ client: base, listing: sample.listing, analyses });
const unused = analyses.map((a) => a.file).find((f) => !JSON.stringify(plan).includes(f));

const fix = (over: Partial<CritiqueFix> & { slide: number }): CritiqueFix => ({
  check: "fit",
  problem: "p",
  headline: null,
  body: null,
  photo: null,
  focalPoint: null,
  ...over,
});

describe("applyCritiqueFixes", () => {
  it("applies copy changes and records them", () => {
    const applied = applyCritiqueFixes(plan, analyses, [fix({ slide: 1, headline: "Shorter" })]);
    expect(applied.problems).toEqual([]);
    expect(applied.plan.slides[1]?.headline).toBe("Shorter");
    expect(applied.changes).toEqual([
      { slide: 1, field: "headline", from: plan.slides[1]?.headline, to: "Shorter" },
    ]);
    expect(applied.changedSlides).toEqual([1]);
    expect(plan.slides[1]?.headline).not.toBe("Shorter"); // input untouched
  });

  it("swaps to an unused photo but rejects a photo already in use", () => {
    expect(unused).toBeDefined();
    expect(
      applyCritiqueFixes(plan, analyses, [fix({ slide: 1, photo: unused ?? "" })]).problems,
    ).toEqual([]);
    const cover = plan.slides[0];
    const taken = cover?.type === "cover" ? cover.photo : "";
    const problems = applyCritiqueFixes(plan, analyses, [fix({ slide: 1, photo: taken })]).problems;
    expect(problems.some((p) => p.includes("is used 2 times"))).toBe(true);
  });

  it("rejects photo changes on galleries and bodies on slides without one", () => {
    const gallery = plan.slides.findIndex((s) => s.type === "gallery");
    const stats = plan.slides.findIndex((s) => s.type === "stats");
    const { problems } = applyCritiqueFixes(plan, analyses, [
      fix({ slide: gallery, photo: unused ?? "" }),
      fix({ slide: stats, body: "Text" }),
    ]);
    expect(problems).toContain(`Slide ${gallery} is a gallery; its photos can't change.`);
    expect(problems).toContain(`Slide ${stats} (stats) has no body.`);
  });

  it("updates the focal point of the slide's photo", () => {
    const applied = applyCritiqueFixes(plan, analyses, [
      fix({ slide: 0, focalPoint: { x: 0.3, y: 0.4 } }),
    ]);
    const cover = plan.slides[0];
    const file = cover?.type === "cover" ? cover.photo : "";
    expect(applied.analyses.find((a) => a.file === file)?.focalPoint).toEqual({ x: 0.3, y: 0.4 });
    expect(applied.changedSlides).toEqual([0]);
  });
});

describe("critique loop in generateCarousel", () => {
  it("re-renders only changed slides and stops when the critique is clean", async () => {
    const rounds: string[] = [];
    const client = createScriptedModelClient((req: ModelRequest) => {
      if (req.step === "critique") {
        rounds.push(`critique:${req.images.length}`);
        return rounds.length === 1
          ? { summary: "Headline too long", fixes: [fix({ slide: 2, headline: "Tighter" })] }
          : { summary: "Looks good", fixes: [] };
      }
      return base.generate(req).then((r) => r.output);
    });
    const renders: (readonly number[] | undefined)[] = [];
    const result = await generateCarousel({
      // Non-critique steps delegate to the sample client, whose output is a promise here.
      client: {
        id: "mock:test",
        generate: async (r) => {
          const { output, usage } = await client.generate(r);
          return { output: await output, usage };
        },
      },
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
      render: ({ plan: p, only }) => {
        renders.push(only);
        return Promise.resolve(
          (only ?? p.slides.map((_, i) => i)).map(() => ({
            png: new Uint8Array([1]),
            overflow: [],
          })),
        );
      },
      prepareSlideImage: () => Promise.resolve({ mediaType: "image/png", base64: "x" }),
    });
    expect(renders).toEqual([undefined, [2]]);
    expect(result.plan.slides[2]?.headline).toBe("Tighter");
    expect(result.critique.map((r) => r.changes.length)).toEqual([1, 0]);
    expect(rounds).toEqual([`critique:${plan.slides.length}`, `critique:${plan.slides.length}`]);
    expect(CarouselPlanSchema.safeParse(result.plan).success).toBe(true);
  });
});

describe("checkCompliance", () => {
  const flagged: CarouselPlan = {
    ...plan,
    caption: "Perfect for young families. A quiet crescent.",
  };

  it("merges word-list and model flags", async () => {
    const client = createScriptedModelClient(() => ({
      flags: [
        {
          location: { slide: null, field: "caption" },
          phrase: "quiet crescent",
          ground: "race or origin",
          reason: "r",
          suggestion: "s",
        },
      ],
    }));
    const flags = await checkCompliance({ client, plan: flagged });
    expect(flags.map((f) => [f.phrase, f.source])).toEqual([
      ["Perfect for young families", "word-list"],
      ["quiet crescent", "model"],
    ]);
  });

  it("retries when a model flag quotes text that isn't there", async () => {
    const client = createScriptedModelClient((_r, i) => ({
      flags:
        i === 0
          ? [
              {
                location: { slide: null, field: "caption" },
                phrase: "made up",
                ground: "age",
                reason: "r",
                suggestion: "s",
              },
            ]
          : [],
    }));
    await checkCompliance({ client, plan: flagged });
    expect(client.calls).toHaveLength(2);
    expect(client.calls[1]?.prompt).toContain(`Flag phrase "made up" doesn't appear at caption`);
  });
});

describe("regenerateSlide", () => {
  const feature = plan.slides.findIndex((s) => s.type === "feature");

  it("returns a new version of the same slide type", async () => {
    const slide = await regenerateSlide({
      client: base,
      listing: sample.listing,
      analyses,
      plan,
      index: feature,
      note: "more detail",
    });
    expect(slide.type).toBe("feature");
    expect(slide).not.toEqual(plan.slides[feature]);
  });

  it("retries when the model changes the slide type", async () => {
    const client = createScriptedModelClient((_r, i) =>
      i === 0
        ? { type: "stats", photo: null, headline: "Numbers", altText: "a" }
        : plan.slides[feature],
    );
    const slide = await regenerateSlide({
      client,
      listing: sample.listing,
      analyses,
      plan,
      index: feature,
      note: "",
    });
    expect(slide).toEqual(plan.slides[feature]);
    expect(client.calls[1]?.prompt).toContain('Keep the slide type "feature".');
    expect(client.calls[0]?.prompt).toContain("(no note; write a fresh version)");
  });
});
