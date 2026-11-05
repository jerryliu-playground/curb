import { ValidationFailedError } from "@curb/pipeline";
import { createScriptedModelClient } from "@curb/pipeline/testing";
import { describe, expect, it } from "vitest";
import { judgeCarousel } from "../src/index.ts";
import { generateWithMock, loadSample, verdict } from "./helpers.ts";

async function setup() {
  const sample = loadSample("01");
  const { plan } = await generateWithMock("01");
  return { ...sample, plan };
}

describe("judgeCarousel", () => {
  it("sends facts, labels and copy, but not the owner's review notes", async () => {
    const { listing, labels, plan } = await setup();
    const client = createScriptedModelClient(() => verdict());
    const result = await judgeCarousel({ client, listing, labels, plan });

    expect(result.headlineQuality.score).toBe(4);
    const [call] = client.calls;
    expect(call?.step).toBe("eval-judge");
    expect(call?.images).toEqual([]);
    expect(call?.prompt).toContain(labels.photos[0]!.visible_features[0]);
    expect(call?.prompt).toContain(plan.slides[0]!.headline);
    expect(call?.prompt).not.toContain("review_notes");
    expect(call?.system).toContain("Accuracy");
  });

  it("retries when a claim isn't quoted from its location", async () => {
    const { listing, labels, plan } = await setup();
    const bad = verdict({
      accuracy: {
        score: 3,
        reason: "One invented fact.",
        unsupportedClaims: [
          { location: { slide: 0, field: "headline" }, claim: "lake view", why: "Not shown." },
        ],
      },
    });
    const good = verdict({
      accuracy: {
        score: 3,
        reason: "One invented fact.",
        unsupportedClaims: [
          {
            location: { slide: 0, field: "headline" },
            claim: plan.slides[0]!.headline,
            why: "Not shown.",
          },
        ],
      },
    });
    const client = createScriptedModelClient((_, i) => (i === 0 ? bad : good));
    const result = await judgeCarousel({ client, listing, labels, plan });

    expect(result.accuracy.unsupportedClaims).toHaveLength(1);
    expect(client.calls).toHaveLength(2);
    expect(client.calls[1]?.prompt).toContain(
      'Claim "lake view" doesn\'t appear in Slide 1 headline',
    );
  });

  it("rejects an accuracy score that contradicts the claim list", async () => {
    const { listing, labels, plan } = await setup();
    const client = createScriptedModelClient(() =>
      verdict({ accuracy: { score: 3, reason: "Hmm.", unsupportedClaims: [] } }),
    );
    await expect(judgeCarousel({ client, listing, labels, plan })).rejects.toThrow(
      ValidationFailedError,
    );
    expect(client.calls[1]?.prompt).toContain("must be 5 when unsupportedClaims is empty");
  });
});
