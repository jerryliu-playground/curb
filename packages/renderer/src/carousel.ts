import { join } from "node:path";
import type { BrandKit, CarouselPlan, Listing, PhotoAnalysis } from "@curb/shared";
import { renderSlideDocument, type SlideContext, type Template } from "@curb/templates";
import { fontFilePath, fontFaceCss } from "./fonts.ts";
import { ASSET_ORIGIN, type RenderedSlide, type SlideRenderer } from "./renderer.ts";

export interface RenderCarouselInput {
  template: Template;
  listing: Listing;
  plan: CarouselPlan;
  analyses: readonly PhotoAnalysis[];
  brandKit: BrandKit;
  /** Directory holding the listing's photos (the full-size files, not the model copies). */
  photoDir: string;
  /** Slide indexes to render, in the order returned. Defaults to every slide. */
  only?: readonly number[];
}

/** Renders every slide of a plan with one template. */
export async function renderCarousel(
  renderer: SlideRenderer,
  input: RenderCarouselInput,
): Promise<RenderedSlide[]> {
  const photos = new Set(input.analyses.map((a) => a.file));
  const assets = (path: string): string | undefined => {
    const [, kind, name] = path.split("/");
    if (!name || name.includes("..")) return undefined;
    if (kind === "photos" && photos.has(name)) return join(input.photoDir, name);
    if (kind === "fonts") return fontFilePath(name);
    return undefined;
  };
  const focalPoints = Object.fromEntries(input.analyses.map((a) => [a.file, a.focalPoint]));
  const fonts = fontFaceCss();

  const results: RenderedSlide[] = [];
  for (const index of input.only ?? input.plan.slides.keys()) {
    const slide = input.plan.slides[index];
    if (!slide) throw new Error(`There is no slide ${index} to render.`);
    const ctx: SlideContext = {
      listing: input.listing,
      brandKit: input.brandKit,
      photoUrl: (file) => `${ASSET_ORIGIN}/photos/${encodeURIComponent(file)}`,
      focalPoints,
      index,
      total: input.plan.slides.length,
    };
    const html = renderSlideDocument(input.template, slide, ctx, { fontFaceCss: fonts });
    results.push(await renderer.render(html, assets));
  }
  return results;
}
