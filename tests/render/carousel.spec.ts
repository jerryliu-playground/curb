import { expect, test } from "@playwright/test";
import { launchRenderer, renderCarousel, type SlideRenderer } from "@curb/renderer";
import type { BrandKit, CarouselPlan, Listing } from "@curb/shared";
import { DEMO_BRAND_KIT, TEMPLATES } from "@curb/templates";
import { plannedSample } from "./helpers.ts";

// CLAUDE.md rule 7: every slide type × template renders sample data with zero DOM overflow.
let renderer: SlideRenderer;
test.beforeAll(async () => {
  renderer = await launchRenderer();
});
test.afterAll(async () => {
  await renderer.close();
});

const SAMPLES = ["01", "02", "03", "04", "05"];

for (const [name, template] of Object.entries(TEMPLATES)) {
  for (const id of SAMPLES) {
    test(`${name}: sample ${id} renders every slide without overflow`, async () => {
      const sample = await plannedSample(id);
      const slides = await renderCarousel(renderer, {
        template,
        listing: sample.listing,
        plan: sample.plan,
        analyses: sample.analyses,
        brandKit: DEMO_BRAND_KIT,
        photoDir: sample.dir,
      });
      const problems = slides.flatMap((s, i) =>
        s.overflow.map((o) => `slide ${i + 1} (${sample.plan.slides[i]?.type}): ${o}`),
      );
      expect(problems).toEqual([]);
      for (const s of slides) expect(s.png.readUInt32BE(16)).toBe(1080);
    });
  }

  test(`${name}: copy at the schema limits still fits`, async () => {
    const sample = await plannedSample("01");
    const files = sample.analyses.map((a) => a.file);
    const f = (i: number) => files[i] ?? "";
    // Realistic worst cases: max-length copy in normal words, long address, big numbers.
    const headline = "Sunlit chef's kitchen with island seating"; // 40 chars
    const body =
      "Floor-to-ceiling windows, wide-plank oak floors and a double-sided gas fireplace open onto the terrace overlooking the treed backyard ravine."; // 140
    const listing: Listing = {
      ...sample.listing,
      address: {
        ...sample.listing.address,
        street: "12345 Lakeshore Boulevard West",
        city: "Niagara-on-the-Lake",
      },
      price_cad: 99_999_999,
      beds: 12,
      baths: 10.5,
      sqft: 99_999,
    };
    const brandKit: BrandKit = {
      ...DEMO_BRAND_KIT,
      agentName: "Alexandra Montgomery-Kowalczyk", // 30
      brokerage: "Northline Realty Brokerage Group of Southern Ontario", // 50
      phone: "+1 (416) 555-0142 x9", // 20
      email: "alexandra.montgomery-kowalczyk@northline.example", // 49
    };
    const plan: CarouselPlan = {
      slides: [
        { type: "cover", photo: f(0), headline, altText: "a" },
        { type: "feature", photo: f(1), headline, body, altText: "a" },
        { type: "stats", photo: f(2), headline, altText: "a" },
        { type: "gallery", photos: [f(3), f(4), f(5)], headline, altText: "a" },
        { type: "neighbourhood", photo: f(6), headline, body, altText: "a" },
        {
          type: "cta",
          photo: f(7),
          headline,
          body: "Book a private showing this week to see the kitchen, the terrace and the backyard in person.", // 100
          altText: "a",
        },
      ],
      caption: "c",
      hashtags: ["#a", "#b", "#c", "#d", "#e"],
    };
    // The same copy in the other layout variants: no-photo stats and cta, two-photo gallery.
    const variants: CarouselPlan = {
      ...plan,
      slides: plan.slides.map((s) => {
        if (s.type === "stats" || s.type === "cta") return { ...s, photo: null };
        if (s.type === "gallery") return { ...s, photos: [f(3), f(4)] };
        return s;
      }),
    };
    for (const [label, p] of [
      ["photos", plan],
      ["variants", variants],
    ] as const) {
      const slides = await renderCarousel(renderer, {
        template,
        listing,
        plan: p,
        analyses: sample.analyses,
        brandKit,
        photoDir: sample.dir,
      });
      const problems = slides.flatMap((s, i) =>
        s.overflow.map((o) => `${label} slide ${i + 1} (${p.slides[i]?.type}): ${o}`),
      );
      expect(problems).toEqual([]);
    }
  });

  test(`${name}: overflow is detected, not hidden`, async () => {
    const sample = await plannedSample("01");
    const plan = structuredClone(sample.plan);
    const long = "This headline is far too long to fit in two lines on the slide at all";
    plan.slides = plan.slides.map((s) => ({ ...s, headline: long }));
    const slides = await renderCarousel(renderer, {
      template,
      listing: sample.listing,
      plan,
      analyses: sample.analyses,
      brandKit: DEMO_BRAND_KIT,
      photoDir: sample.dir,
    });
    for (const [i, s] of slides.entries()) {
      expect(
        s.overflow.some((o) => o.startsWith("headline:")),
        `slide ${i + 1}`,
      ).toBe(true);
    }
  });
}
