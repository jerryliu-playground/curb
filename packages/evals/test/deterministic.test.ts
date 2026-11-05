import type { SampleLabels } from "@curb/pipeline/testing";
import { type CarouselPlan, slidePhotos } from "@curb/shared";
import { describe, expect, it } from "vitest";
import { passesDeterministic, scoreDeterministic } from "../src/index.ts";
import { generateWithMock, loadSample, sampleIds } from "./helpers.ts";

describe("scoreDeterministic", () => {
  it.each(sampleIds)("passes every check for the mocked plan of sample %s", async (id) => {
    const sample = loadSample(id);
    const result = await generateWithMock(id);
    const scores = scoreDeterministic({
      result,
      labels: sample.labels,
      photoFiles: sample.files,
      overflow: { modern: [], classic: [] },
    });
    expect(scores.ruleProblems).toEqual([]);
    expect(scores.reusedPhotos).toEqual([]);
    expect(scores.roomTypes.correct).toBe(sample.labels.photos.length);
    expect(scores.slideCount).toBe(result.plan.slides.length);
    expect(passesDeterministic(scores)).toBe(true);
  });

  async function scoreWith(edit: (plan: CarouselPlan) => CarouselPlan, labels?: SampleLabels) {
    const sample = loadSample("01");
    const result = await generateWithMock("01");
    return scoreDeterministic({
      result: { ...result, plan: edit(result.plan) },
      labels: labels ?? sample.labels,
      photoFiles: sample.files,
      overflow: { modern: ["slide 2: headline"], classic: [] },
    });
  }

  it("counts reused photos once, outside the rule problems", async () => {
    const scores = await scoreWith((plan) => ({
      ...plan,
      slides: plan.slides.map((s, i) =>
        i === 1 && s.type === "feature" ? { ...s, photo: slidePhotos(plan.slides[0]!)[0]! } : s,
      ),
    }));
    expect(scores.reusedPhotos).toHaveLength(1);
    expect(scores.ruleProblems.join()).not.toContain("at most once");
  });

  it("reports character limits and counts as rule problems", async () => {
    const scores = await scoreWith((plan) => ({
      ...plan,
      hashtags: plan.hashtags.slice(0, 2),
      slides: plan.slides.map((s, i) => (i === 0 ? { ...s, headline: "x".repeat(80) } : s)),
    }));
    expect(scores.ruleProblems.join("\n")).toMatch(/slides\.0\.headline/);
    expect(scores.ruleProblems.join("\n")).toMatch(/hashtags/);
    expect(passesDeterministic(scores)).toBe(false);
  });

  it("fails the pass when any template overflows, and lists room-type mismatches", async () => {
    const sample = loadSample("01");
    const [first, ...rest] = sample.labels.photos;
    const labels = { photos: [{ ...first!, room_type: "garage" as const }, ...rest] };
    const scores = await scoreWith((plan) => plan, labels);
    expect(scores.overflow.modern).toEqual(["slide 2: headline"]);
    expect(passesDeterministic(scores)).toBe(false);
    expect(scores.roomTypes.correct).toBe(scores.roomTypes.total - 1);
    expect(scores.roomTypes.mismatches[0]).toContain("labelled garage");
  });
});
