import { describe, expect, it } from "vitest";
import {
  checkComplianceWordList,
  type CopyText,
  flagId,
  locationLabel,
  mergeFlags,
} from "../src/index.ts";

const caption = (text: string): CopyText[] => [
  { location: { slide: null, field: "caption" }, text },
];

describe("compliance word list", () => {
  it.each([
    ["Perfect for young families who love to cook.", "Perfect for young families", "family status"],
    ["Set in an exclusive neighbourhood.", "exclusive neighbourhood", "race or origin"],
    ["Walking distance to shops.", "Walking distance", "disability"],
    ["Ideal for empty nesters.", "empty nesters", "family status"],
    ["Great for young professionals.", "young professionals", "age"],
    ["Steps from a church? No: near the church.", "near the church", "creed"],
  ])("flags %j", (text, phrase, ground) => {
    const [flag] = checkComplianceWordList(caption(text));
    expect(flag?.phrase).toBe(phrase);
    expect(flag?.ground).toBe(ground);
    expect(flag?.source).toBe("word-list");
    expect(flag?.suggestion.length).toBeGreaterThan(5);
  });

  it.each([
    "Four bedrooms and a primary ensuite.",
    "Single-level living with a fenced backyard.",
    "A family room with built-in shelves.",
    "Walk-in closet and wide-plank floors.",
  ])("doesn't flag neutral property descriptions: %j", (text) => {
    expect(checkComplianceWordList(caption(text))).toEqual([]);
  });

  it("gives stable ids and readable labels", () => {
    const location = { slide: 2, field: "body" as const };
    expect(flagId(location, "Perfect For Families")).toBe("slide2.body:perfect-for-families");
    expect(locationLabel(location)).toBe("Slide 3 body");
    expect(locationLabel({ slide: null, field: "caption" })).toBe("caption");
  });

  it("merges duplicate flags, keeping the first", () => {
    const [a] = checkComplianceWordList(caption("Exclusive community."));
    if (!a) throw new Error("expected a flag");
    const fromModel = { ...a, source: "model" as const, reason: "model reason" };
    expect(mergeFlags([a], [fromModel])).toEqual([a]);
  });
});
