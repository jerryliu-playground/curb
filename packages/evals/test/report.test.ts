import { describe, expect, it } from "vitest";
import { comparisonNotes, METRICS, previousRun, renderReport, trend } from "../src/index.ts";
import { evalRun, listingEval, verdict } from "./helpers.ts";

const metric = (key: string) => METRICS.find((m) => m.key === key)!;

describe("metrics", () => {
  it("averages counts per completed listing and ignores failed ones", () => {
    const run = evalRun({
      listings: [
        listingEval({ id: "01" }),
        listingEval({
          id: "02",
          judge: verdict({
            accuracy: {
              score: 3,
              reason: "x",
              unsupportedClaims: [
                { location: { slide: 1, field: "body" }, claim: "a", why: "b" },
                { location: { slide: 2, field: "body" }, claim: "c", why: "d" },
              ],
            },
          }),
        }),
        listingEval({ id: "03", status: "failed", error: "boom", deterministic: undefined }),
      ],
    });
    expect(metric("completed").value(run)).toBeCloseTo(2 / 3);
    expect(metric("accuracy").value(run)).toBe(4);
    expect(metric("unsupportedClaims").value(run)).toBe(1);
    expect(metric("roomTypes").value(run)).toBeCloseTo(0.9);
  });

  it("returns null for judge metrics when nothing was judged", () => {
    const run = evalRun({ judgeModel: null, listings: [listingEval({ judge: undefined })] });
    expect(metric("headline").value(run)).toBeNull();
  });

  it("knows which direction is better", () => {
    expect(trend(metric("accuracy"), 4, 4.5)).toBe("better");
    expect(trend(metric("unsupportedClaims"), 0, 1)).toBe("worse");
    expect(trend(metric("accuracy"), 4, 4.001)).toBe("same");
    expect(trend(metric("critiqueChanges"), 1, 3)).toBe("n/a");
    expect(trend(metric("accuracy"), null, 4)).toBe("n/a");
  });
});

describe("previousRun and comparisonNotes", () => {
  it("compares only with an earlier run in the same mode", () => {
    const run = evalRun({ id: "20261103-000000" });
    const history = [
      evalRun({ id: "20261101-000000" }),
      evalRun({ id: "20261102-000000", mode: "mock" }),
      evalRun({ id: "20261104-000000" }),
    ];
    expect(previousRun(run, history)?.id).toBe("20261101-000000");
  });

  it("names prompt, model, judge and listing changes", () => {
    const before = evalRun();
    const after = evalRun({
      prompts: { "carousel-plan": 2, "eval-judge": 2 },
      model: "anthropic:claude-sonnet-5-5",
      listings: [listingEval({ id: "02" })],
    });
    const notes = comparisonNotes(after, before).join("\n");
    expect(notes).toContain("carousel-plan v1 → v2");
    expect(notes).toContain("Model changed");
    expect(notes).toContain("judge scores are not directly comparable");
    expect(notes).toContain("different listings");
  });
});

describe("renderReport", () => {
  it("shows the summary, a row per listing, details and the trend", () => {
    const run = evalRun({
      id: "20261102-000000",
      listings: [
        listingEval(),
        listingEval({
          id: "02",
          status: "failed",
          error: "carousel-plan failed",
          deterministic: undefined,
        }),
      ],
    });
    const report = renderReport(run, [evalRun()]);

    expect(report).toContain("Compared with run `20261101-120000`");
    expect(report).toContain("| Judge: accuracy, no invented facts (1–5) | 5.00 | 5.00 | = |");
    expect(report).toContain("| 02 | failed |");
    expect(report).toContain("carousel-plan failed");
    expect(report).toContain("Room type: a.jpg: labelled kitchen, analysed dining_room");
    expect(report).toMatch(/## Trend \(last 2 real runs\)/);
  });

  it("calls out a blocking regression in accuracy", () => {
    const worse = listingEval({
      judge: verdict({
        accuracy: {
          score: 3,
          reason: "Invented a view.",
          unsupportedClaims: [
            {
              location: { slide: 0, field: "headline" },
              claim: "lake view",
              why: "Not in labels.",
            },
          ],
        },
      }),
    });
    const report = renderReport(evalRun({ id: "20261102-000000", listings: [worse] }), [evalRun()]);
    expect(report).toContain("**Blocking regression:**");
    expect(report).toContain('Unsupported claim (Slide 1 headline): "lake view". Not in labels.');
    expect(report).toContain("▼ worse");
  });

  it("separates invented claims from claims the photo analysis made", () => {
    const location = { slide: 0, field: "altText" } as const;
    const lake = { location, claim: "lake view", why: "Not in labels." };
    const sofa = { location, claim: "red sofa", why: "Not in labels." };
    const l = listingEval({
      judge: verdict({
        accuracy: { score: 2, reason: "Two claims.", unsupportedClaims: [sofa, lake] },
      }),
      claims: [
        { claim: sofa, fromPhotoAnalysis: ["curved red sofa (a.jpg)"] },
        { claim: lake, fromPhotoAnalysis: [] },
      ],
    });
    const run = evalRun({ listings: [l] });
    const report = renderReport(run, []);

    expect(metric("inventedClaims").value(run)).toBe(1);
    expect(report).toContain("| 2 (1 invented) |");
    expect(report.indexOf('**Invented claim** (Slide 1 alt text): "lake view"')).toBeLessThan(
      report.indexOf('Claim from photo analysis (Slide 1 alt text): "red sofa"'),
    );
    expect(report).toContain('Likely from: "curved red sofa (a.jpg)"');
  });

  it("says when there is nothing to compare with", () => {
    expect(renderReport(evalRun(), [])).toContain("No earlier run to compare with.");
  });
});
