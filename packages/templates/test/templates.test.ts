import { type Listing, SLIDE_TYPES, type Slide } from "@curb/shared";
import { describe, expect, it } from "vitest";
import {
  DEMO_BRAND_KIT,
  formatPrice,
  renderSlideDocument,
  slideCounter,
  TEMPLATES,
  type SlideContext,
} from "../src/index.ts";

const listing: Listing = {
  id: "t",
  address: { street: "1 Test Lane", city: "Guelph", province: "ON", postal_code: "N1G 1A1" },
  price_cad: 1234567,
  property_type: "detached",
  beds: 3,
  baths: 2.5,
  sqft: 2100,
  description: "A house.",
  highlights: [],
};

const ctx: SlideContext = {
  listing,
  brandKit: DEMO_BRAND_KIT,
  photoUrl: (file) => `https://assets.curb.local/photos/${file}`,
  focalPoints: { "a.jpg": { x: 0.25, y: 0.75 } },
  index: 0,
  total: 8,
};

const examples: Record<(typeof SLIDE_TYPES)[number], Slide> = {
  cover: { type: "cover", photo: "a.jpg", headline: "Cover headline", altText: "x" },
  feature: { type: "feature", photo: "a.jpg", headline: "Kitchen", body: "Island.", altText: "x" },
  stats: { type: "stats", photo: null, headline: "At a glance", altText: "x" },
  gallery: { type: "gallery", photos: ["a.jpg", "b.jpg"], headline: "More", altText: "x" },
  neighbourhood: {
    type: "neighbourhood",
    photo: "a.jpg",
    headline: "Guelph",
    body: "Quiet lane.",
    altText: "x",
  },
  cta: { type: "cta", photo: null, headline: "Book a showing", body: "Call us.", altText: "x" },
};

describe.each(Object.entries(TEMPLATES))("template %s", (_name, template) => {
  it.each(SLIDE_TYPES)("renders the %s slide as a full document", (type) => {
    const html = renderSlideDocument(template, examples[type], ctx, { fontFaceCss: "/*fonts*/" });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("/*fonts*/");
    expect(html).toContain(`--c-primary: ${DEMO_BRAND_KIT.colors.primary}`);
    expect(html).toContain('data-fit="headline"');
    // Only the renderer's asset host may be referenced: renders must not depend on the network.
    const urls = html.match(/https?:\/\/[^"')\s]+/g) ?? [];
    for (const url of urls) expect(url.startsWith("https://assets.curb.local/")).toBe(true);
  });

  it("uses listing facts, not plan text, for price and address", () => {
    const html = renderSlideDocument(template, examples.cover, ctx, { fontFaceCss: "" });
    expect(html).toContain("$1,234,567");
    expect(html).toContain("1 Test Lane, Guelph");
    expect(html).toContain("object-position:25% 75%");
  });

  it("shows the agent card on the cta slide", () => {
    const html = renderSlideDocument(template, examples.cta, ctx, { fontFaceCss: "" });
    expect(html).toContain(DEMO_BRAND_KIT.agentName);
    expect(html).toContain(DEMO_BRAND_KIT.phone);
  });
});

describe("template heading font", () => {
  it("uses the template's own face while the brand kit keeps the default heading font", () => {
    const html = renderSlideDocument(TEMPLATES.classic, examples.cover, ctx, { fontFaceCss: "" });
    expect(html).toContain("--template-heading:&quot;Cormorant Garamond&quot;, serif");
  });

  it("keeps a heading font the brand kit chose", () => {
    const brandKit = {
      ...DEMO_BRAND_KIT,
      fonts: { heading: "Playfair Display" as const, body: "Inter" as const },
    };
    const html = renderSlideDocument(
      TEMPLATES.classic,
      examples.cover,
      { ...ctx, brandKit },
      { fontFaceCss: "" },
    );
    expect(html).toContain("--template-heading:var(--font-heading)");
    expect(html).toContain('--font-heading: "Playfair Display"');
  });
});

describe("format", () => {
  it("formats prices in Canadian dollars", () => {
    expect(formatPrice(6495000)).toBe("$6,495,000");
  });
  it("pads the slide counter", () => {
    expect(slideCounter(0, 8)).toBe("01/08");
  });
});
