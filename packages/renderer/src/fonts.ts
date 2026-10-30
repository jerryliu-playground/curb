import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_ORIGIN } from "./renderer.ts";

interface BundledFontFile {
  family: string;
  style: "normal" | "italic";
  file: string;
  pkg: string;
  weight: string;
}

const INTER = "@fontsource-variable/inter/package.json";
const CORMORANT = "@fontsource-variable/cormorant-garamond/package.json";
const PLAYFAIR = "@fontsource-variable/playfair-display/package.json";

/** Bundled OFL fonts (ADR 0011), served to the page from the asset origin. */
const FONTS: readonly BundledFontFile[] = [
  {
    family: "Inter",
    style: "normal",
    file: "inter-latin-wght-normal.woff2",
    pkg: INTER,
    weight: "100 900",
  },
  {
    family: "Cormorant Garamond",
    style: "normal",
    file: "cormorant-garamond-latin-wght-normal.woff2",
    pkg: CORMORANT,
    weight: "300 700",
  },
  {
    family: "Cormorant Garamond",
    style: "italic",
    file: "cormorant-garamond-latin-wght-italic.woff2",
    pkg: CORMORANT,
    weight: "300 700",
  },
  {
    family: "Playfair Display",
    style: "normal",
    file: "playfair-display-latin-wght-normal.woff2",
    pkg: PLAYFAIR,
    weight: "400 900",
  },
  {
    family: "Playfair Display",
    style: "italic",
    file: "playfair-display-latin-wght-italic.woff2",
    pkg: PLAYFAIR,
    weight: "400 900",
  },
];

export function fontFaceCss(): string {
  return FONTS.map(
    (f) =>
      `@font-face { font-family: "${f.family}"; font-style: ${f.style}; font-display: block; ` +
      `font-weight: ${f.weight}; src: url("${ASSET_ORIGIN}/fonts/${f.file}") format("woff2"); }`,
  ).join("\n");
}

/** Maps `/fonts/<file>` to the font file on disk. */
export function fontFilePath(file: string): string | undefined {
  const font = FONTS.find((f) => f.file === file);
  if (!font) return undefined;
  return join(dirname(fileURLToPath(import.meta.resolve(font.pkg))), "files", font.file);
}
