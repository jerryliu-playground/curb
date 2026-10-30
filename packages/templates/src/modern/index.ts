import type { Template } from "../types.ts";
import { Cover, Cta, Feature, Gallery, Neighbourhood, Stats } from "./slides.tsx";
import { MODERN_CSS } from "./styles.ts";

export const modernTemplate: Template = {
  name: "modern",
  css: MODERN_CSS,
  slides: {
    cover: Cover,
    feature: Feature,
    stats: Stats,
    gallery: Gallery,
    neighbourhood: Neighbourhood,
    cta: Cta,
  },
};
