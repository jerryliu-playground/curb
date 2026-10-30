import type { Template } from "../types.ts";
import { Cover, Cta, Feature, Gallery, Neighbourhood, Stats } from "./slides.tsx";
import { EDITORIAL_CSS } from "./styles.ts";

export const editorialTemplate: Template = {
  name: "editorial",
  css: EDITORIAL_CSS,
  slides: {
    cover: Cover,
    feature: Feature,
    stats: Stats,
    gallery: Gallery,
    neighbourhood: Neighbourhood,
    cta: Cta,
  },
};
