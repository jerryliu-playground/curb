import type { CarouselPlan, PhotoAnalysis, UnsupportedClaim } from "@curb/shared";
import { describe, expect, it } from "vitest";
import { classifyClaims, contentWords } from "../src/index.ts";

const analysis = (file: string, keyFeatures: string[]): PhotoAnalysis => ({
  file,
  roomType: "living_room",
  keyFeatures,
  qualityScore: 4,
  heroScore: 3,
  focalPoint: { x: 0.5, y: 0.5 },
});

const analyses = [
  analysis("a.jpg", ["curved channel-tufted red sofa", "dark herringbone floors"]),
  analysis("b.jpg", ["in-ground pool", "stone pool coping"]),
];

// Only the slide → photo mapping and slide count matter here.
const plan = {
  slides: [
    { type: "cover", photo: "a.jpg", headline: "h", altText: "x" },
    { type: "feature", photo: "b.jpg", headline: "h", body: "b", altText: "x" },
  ],
  caption: "c",
  hashtags: ["#a"],
} as unknown as CarouselPlan;

const claim = (
  text: string,
  slide: number | null,
  field: UnsupportedClaim["location"]["field"] = "altText",
): UnsupportedClaim => ({ location: { slide, field }, claim: text, why: "Not in labels." });

describe("contentWords", () => {
  it("drops stop words and strips simple plurals", () => {
    expect(contentWords("Black-framed glass doors with the floors")).toEqual([
      "black",
      "framed",
      "glass",
      "door",
      "floor",
    ]);
    expect(contentWords("glass")).toEqual(["glass"]);
  });
});

describe("classifyClaims", () => {
  it("traces a reworded claim to the photo analysis of its slide's photo", () => {
    const [check] = classifyClaims([claim("a curved red sofa", 0)], plan, analyses);
    expect(check?.fromPhotoAnalysis).toEqual(["curved channel-tufted red sofa (a.jpg)"]);
  });

  it("doesn't credit features of a photo on another slide", () => {
    const [check] = classifyClaims([claim("stone coping", 0)], plan, analyses);
    expect(check?.fromPhotoAnalysis).toEqual([]);
  });

  it("matches caption claims against every photo", () => {
    const [check] = classifyClaims([claim("stone coping", null, "caption")], plan, analyses);
    expect(check?.fromPhotoAnalysis).toEqual(["stone pool coping (b.jpg)"]);
  });

  it("treats a claim with too little overlap as invented", () => {
    const [check] = classifyClaims([claim("lake view from the sofa", 0)], plan, analyses);
    expect(check?.fromPhotoAnalysis).toEqual([]);
  });
});
