import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_ORIGIN } from "./renderer.ts";

/** Bundled OFL fonts (ADR 0011), served to the page from the asset origin. */
const FONTS = [
  {
    family: "Inter",
    file: "inter-latin-wght-normal.woff2",
    pkg: "@fontsource-variable/inter/package.json",
    weight: "100 900",
  },
] as const;

export function fontFaceCss(): string {
  return FONTS.map(
    (f) =>
      `@font-face { font-family: "${f.family}"; font-style: normal; font-display: block; ` +
      `font-weight: ${f.weight}; src: url("${ASSET_ORIGIN}/fonts/${f.file}") format("woff2"); }`,
  ).join("\n");
}

/** Maps `/fonts/<file>` to the font file on disk. */
export function fontFilePath(file: string): string | undefined {
  const font = FONTS.find((f) => f.file === file);
  if (!font) return undefined;
  return join(dirname(fileURLToPath(import.meta.resolve(font.pkg))), "files", font.file);
}
