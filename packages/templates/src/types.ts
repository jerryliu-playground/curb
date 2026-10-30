import type { BrandKit, Listing, SlideOf, SlideType } from "@curb/shared";
import type { ReactElement } from "react";

export interface FocalPoint {
  x: number;
  y: number;
}

/** Everything a slide needs besides its own plan data. Templates get data only, never I/O. */
export interface SlideContext {
  listing: Listing;
  brandKit: BrandKit;
  /** Maps a photo file name to the URL the renderer serves it from. */
  photoUrl: (file: string) => string;
  focalPoints: Readonly<Record<string, FocalPoint>>;
  /** 0-based position in the carousel. */
  index: number;
  total: number;
}

export type SlideComponent<T extends SlideType> = (props: {
  slide: SlideOf<T>;
  ctx: SlideContext;
}) => ReactElement;

/** A visual style. Every template implements every slide type (CLAUDE.md rule 6). */
export interface Template {
  name: string;
  css: string;
  slides: { [K in SlideType]: SlideComponent<K> };
}
