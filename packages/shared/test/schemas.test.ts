import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type CarouselPlan,
  CarouselPlanSchema,
  checkCarouselPlan,
  ListingSchema,
  listingFacts,
  PhotoAnalysisOutputSchema,
  RoomTypeSchema,
} from "../src/index.ts";

const samplesDir = join(import.meta.dirname, "../../../samples");
const sampleIds = readdirSync(samplesDir).filter((d) => /^\d+$/.test(d));
const readJson = (id: string, file: string): unknown =>
  JSON.parse(readFileSync(join(samplesDir, id, file), "utf8"));

describe("samples match the schemas", () => {
  it.each(sampleIds)("sample %s listing.json parses", (id) => {
    expect(() => ListingSchema.parse(readJson(id, "listing.json"))).not.toThrow();
  });

  it.each(sampleIds)("sample %s labels use known room types", (id) => {
    const labels = readJson(id, "labels.json") as { photos: { room_type: string }[] };
    for (const p of labels.photos) expect(RoomTypeSchema.safeParse(p.room_type).success).toBe(true);
  });
});

describe("listingFacts", () => {
  it("drops owner-only notes", () => {
    const listing = ListingSchema.parse(readJson(sampleIds[0] ?? "01", "listing.json"));
    expect(listingFacts(listing)).not.toHaveProperty("review_notes");
  });
});

// JSON outputs (ADR 0007) need closed, non-recursive objects. Catch schema drift here
// instead of in a paid eval run.
describe("model output schemas are JSON-outputs compatible", () => {
  function walk(node: unknown, visit: (obj: Record<string, unknown>) => void): void {
    if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
    else if (node && typeof node === "object") {
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((n) => walk(n, visit));
    }
  }

  it.each([
    ["PhotoAnalysisOutput", PhotoAnalysisOutputSchema],
    ["CarouselPlan", CarouselPlanSchema],
  ] as const)("%s: every object is closed and has no $ref recursion", (_name, schema) => {
    const json = z.toJSONSchema(schema);
    walk(json, (obj) => {
      if (obj.type === "object") {
        expect(obj.additionalProperties).toBe(false);
        expect(obj.required).toEqual(Object.keys(obj.properties as object));
      }
      expect(obj).not.toHaveProperty("$ref");
    });
  });
});

const photos = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg", "f.jpg", "g.jpg"];
const validPlan: CarouselPlan = {
  slides: [
    { type: "cover", photo: "a.jpg", headline: "Hilltop modern", altText: "Front of the house" },
    {
      type: "feature",
      photo: "b.jpg",
      headline: "Kitchen",
      body: "Island seating.",
      altText: "Kitchen",
    },
    { type: "stats", photo: null, headline: "The numbers", altText: "Beds, baths, size" },
    { type: "gallery", photos: ["c.jpg", "d.jpg"], headline: "Inside", altText: "Two rooms" },
    {
      type: "neighbourhood",
      photo: "e.jpg",
      headline: "Burlington",
      body: "On a quiet lane.",
      altText: "View",
    },
    {
      type: "cta",
      photo: "f.jpg",
      headline: "Book a showing",
      body: "Contact us.",
      altText: "Patio",
    },
  ],
  caption: "A new listing.",
  hashtags: ["#Burlington", "#ForSale", "#RealEstate", "#Ontario", "#NewListing"],
};

describe("CarouselPlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(CarouselPlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it("rejects a headline over the limit", () => {
    const plan = structuredClone(validPlan);
    plan.slides[0] = {
      ...validPlan.slides[0],
      headline: "x".repeat(41),
    } as CarouselPlan["slides"][0];
    expect(CarouselPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects too few slides", () => {
    expect(
      CarouselPlanSchema.safeParse({ ...validPlan, slides: validPlan.slides.slice(0, 5) }).success,
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(CarouselPlanSchema.safeParse({ ...validPlan, extra: 1 }).success).toBe(false);
  });
});

describe("checkCarouselPlan", () => {
  it("passes a valid plan", () => {
    expect(checkCarouselPlan(validPlan, photos)).toEqual([]);
  });

  it("reports unknown and repeated photos", () => {
    const plan = structuredClone(validPlan);
    plan.slides[1] = { ...(plan.slides[1] as object), photo: "a.jpg" } as CarouselPlan["slides"][1];
    plan.slides[4] = {
      ...(plan.slides[4] as object),
      photo: "zzz.jpg",
    } as CarouselPlan["slides"][4];
    const problems = checkCarouselPlan(plan, photos);
    expect(problems).toContain('Photo "a.jpg" is used 2 times; use each photo at most once.');
    expect(problems.some((p) => p.includes('"zzz.jpg", which is not one of'))).toBe(true);
  });

  it("requires cover first and cta last", () => {
    const plan = { ...validPlan, slides: [...validPlan.slides].reverse() };
    const problems = checkCarouselPlan(plan, photos);
    expect(problems).toContain("The first slide must be the cover.");
    expect(problems).toContain("The last slide must be the cta slide.");
  });

  it("rejects malformed and repeated hashtags", () => {
    const plan = { ...validPlan, hashtags: ["#ok", "no-hash", "#OK", "#a b", "#x"] };
    const problems = checkCarouselPlan(plan, photos);
    expect(problems).toContain(
      'Hashtag "no-hash" must be "#" followed by letters and digits only.',
    );
    expect(problems).toContain('Hashtag "#a b" must be "#" followed by letters and digits only.');
    expect(problems).toContain("Hashtags must not repeat.");
  });
});
