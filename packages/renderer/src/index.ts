// Playwright HTML -> PNG rendering and DOM overflow measurement (ADR 0008).
export * from "./carousel.ts";
export * from "./fonts.ts";
export * from "./renderer.ts";

/** Instagram portrait slide size, in CSS pixels. */
export const SLIDE_VIEWPORT = { width: 1080, height: 1350 } as const;
