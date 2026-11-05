import { createSampleModelClient, createScriptedModelClient } from "@curb/pipeline/testing";
import { describe, expect, it } from "vitest";
import { evaluateListing } from "../src/index.ts";
import { generateWithMock, loadSample } from "./helpers.ts";

const noOverflow = () => Promise.resolve({ modern: [] });

describe("evaluateListing", () => {
  it("scores a mocked run end to end, judge included", async () => {
    const sample = loadSample("02");
    let t = 0;
    const result = await evaluateListing({
      listing: sample.listing,
      labels: sample.labels,
      photoFiles: sample.files,
      generate: () => generateWithMock("02"),
      checkOverflow: noOverflow,
      judge: createSampleModelClient(sample),
      now: () => (t += 500),
    });

    expect(result.status).toBe("ok");
    expect(result.title).toBe(`${sample.listing.address.street}, ${sample.listing.address.city}`);
    expect(result.deterministic?.ruleProblems).toEqual([]);
    expect(result.judge?.accuracy.score).toBe(5);
    expect(result.claims).toEqual([]);
    expect(result.analyses).toHaveLength(sample.labels.photos.length);
    expect(result.plan?.slides.length).toBeGreaterThan(0);
    expect(result.durationMs).toBe(500);
  });

  it("records a pipeline failure instead of throwing", async () => {
    const sample = loadSample("03");
    const result = await evaluateListing({
      listing: sample.listing,
      labels: sample.labels,
      photoFiles: sample.files,
      generate: () => Promise.reject(new Error("carousel-plan: failed validation")),
      checkOverflow: noOverflow,
    });
    expect(result).toMatchObject({ status: "failed", error: "carousel-plan: failed validation" });
    expect(result.deterministic).toBeUndefined();
  });

  it("keeps the deterministic scores when the judge fails", async () => {
    const sample = loadSample("03");
    const result = await evaluateListing({
      listing: sample.listing,
      labels: sample.labels,
      photoFiles: sample.files,
      generate: () => generateWithMock("03"),
      checkOverflow: noOverflow,
      judge: createScriptedModelClient(() => ({ nonsense: true })),
    });
    expect(result.status).toBe("ok");
    expect(result.deterministic).toBeDefined();
    expect(result.judge).toBeUndefined();
    expect(result.judgeError).toMatch(/eval-judge/);
  });

  it("skips the judge when none is given", async () => {
    const sample = loadSample("04");
    const result = await evaluateListing({
      listing: sample.listing,
      labels: sample.labels,
      photoFiles: sample.files,
      generate: () => generateWithMock("04"),
      checkOverflow: noOverflow,
    });
    expect(result.judge).toBeUndefined();
    expect(result.judgeUsage).toBeUndefined();
  });
});
