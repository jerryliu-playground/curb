import type { Template } from "../types.ts";
import { Cover, Cta, Feature, Gallery, Neighbourhood, Stats } from "./slides.tsx";
import { CLASSIC_CSS } from "./styles.ts";

export const classicTemplate: Template = {
  name: "classic",
  css: CLASSIC_CSS,
  slides: {
    cover: Cover,
    feature: Feature,
    stats: Stats,
    gallery: Gallery,
    neighbourhood: Neighbourhood,
    cta: Cta,
  },
};
