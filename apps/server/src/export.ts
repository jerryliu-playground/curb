import { type CarouselPlan, type ComplianceFlag, locationLabel } from "@curb/shared";
import { strToU8, zipSync } from "fflate";

const pad = (n: number) => String(n).padStart(2, "0");

/** The export package (SPEC.md §3): slide PNGs, caption, hashtags, alt text, and the flags that were shown. */
export function buildExportZip(input: {
  plan: CarouselPlan;
  slides: readonly Uint8Array[];
  flags: readonly ComplianceFlag[];
}): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  input.plan.slides.forEach((slide, i) => {
    const png = input.slides[i];
    if (png) files[`slide-${pad(i + 1)}-${slide.type}.png`] = png;
  });
  files["caption.txt"] = strToU8(`${input.plan.caption}\n\n${input.plan.hashtags.join(" ")}\n`);
  files["hashtags.txt"] = strToU8(`${input.plan.hashtags.join(" ")}\n`);
  files["alt-text.txt"] = strToU8(
    input.plan.slides.map((s, i) => `${i + 1}. ${s.altText}`).join("\n") + "\n",
  );
  if (input.flags.length > 0) {
    files["compliance-flags.txt"] = strToU8(
      input.flags
        .map(
          (f) =>
            `${locationLabel(f.location)}: "${f.phrase}" (${f.ground}). ${f.reason} Suggestion: ${f.suggestion}`,
        )
        .join("\n") + "\n",
    );
  }
  // PNGs are already compressed; store them as-is.
  return zipSync(files, { level: 0 });
}
