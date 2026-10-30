// Development CLI (CLAUDE.md rule 3: not an export path; exports go through approval in the UI).
// Usage: pnpm generate --listing samples/01 [--mock] [--template modern] [--out out] [--debug]
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateCarousel, type ModelClient } from "@curb/pipeline";
import { createSampleModelClient, type SampleLabels } from "@curb/pipeline/testing";
import { launchRenderer, renderCarousel } from "@curb/renderer";
import { ListingSchema, locationLabel } from "@curb/shared";
import { DEMO_BRAND_KIT, TEMPLATES, type TemplateName } from "@curb/templates";
import { fileCache } from "../io/file-cache.ts";
import { listPhotoFiles, loadPhotosForModel, slideImageForModel } from "../io/photos.ts";
import { createAnthropicModelClient } from "../model/anthropic-client.ts";

const USAGE =
  "Usage: pnpm generate --listing samples/01 [--mock] [--template modern] [--out out] [--debug]";

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    listing: { type: "string" },
    mock: { type: "boolean", default: false },
    template: { type: "string", default: "modern" },
    out: { type: "string", default: "out" },
    debug: { type: "boolean", default: false },
  },
});

// pnpm runs scripts from the package that defines them; resolve paths against where the user ran it.
const cwd = process.env.INIT_CWD ?? process.cwd();
if (!values.listing) fail("Missing --listing.");
const listingDir = resolve(cwd, values.listing);
if (!(values.template in TEMPLATES)) {
  fail(`Unknown template "${values.template}". Available: ${Object.keys(TEMPLATES).join(", ")}.`);
}
const template = TEMPLATES[values.template as TemplateName];

const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(join(listingDir, file), "utf8"));

const listing = ListingSchema.parse(await readJson("listing.json"));
const files = await listPhotoFiles(listingDir);
if (files.length === 0) fail(`No photos found in ${listingDir}.`);

let client: ModelClient;
if (values.mock) {
  client = createSampleModelClient({
    listing,
    labels: (await readJson("labels.json")) as SampleLabels,
  });
} else {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) fail("ANTHROPIC_API_KEY is not set. Set it, or use --mock to run without the API.");
  client = createAnthropicModelClient({ apiKey, debug: values.debug });
}

console.log(
  `Listing ${listing.id}: ${files.length} photos, template ${template.name}, model ${client.id}`,
);
const photos = await loadPhotosForModel(listingDir, files);
const renderer = await launchRenderer();

try {
  const result = await generateCarousel({
    client,
    listing,
    photos,
    brandKit: DEMO_BRAND_KIT,
    cache: fileCache(resolve(cwd, ".cache/photo-analysis")),
    render: (input) => renderCarousel(renderer, { ...input, template, photoDir: listingDir }),
    prepareSlideImage: slideImageForModel,
    onProgress: (e) => {
      if (e.step === "photo-analysis") {
        console.log(`  analyzed ${e.done}/${e.total} ${e.file}${e.fromCache ? " (cached)" : ""}`);
      } else if (e.step === "critique") {
        console.log(
          `  critique round ${e.round}: ${e.status}${e.changes === undefined ? "" : `, ${e.changes} changes`}`,
        );
      } else if (e.step === "render") console.log(`  render ${e.slides} slides: ${e.status}`);
      else console.log(`  ${e.step}: ${e.status}`);
    },
  });

  const outDir = resolve(cwd, values.out, listing.id);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const [i, slide] of result.slides.entries()) {
    const type = result.plan.slides[i]?.type ?? "slide";
    await writeFile(join(outDir, `slide-${String(i + 1).padStart(2, "0")}-${type}.png`), slide.png);
  }
  await writeFile(
    join(outDir, "caption.txt"),
    `${result.plan.caption}\n\n${result.plan.hashtags.join(" ")}\n`,
  );
  await writeFile(
    join(outDir, "alt-text.txt"),
    result.plan.slides.map((s, i) => `${i + 1}. ${s.altText}`).join("\n") + "\n",
  );
  await writeFile(join(outDir, "plan.json"), JSON.stringify(result.plan, null, 2));
  await writeFile(join(outDir, "photo-analysis.json"), JSON.stringify(result.analyses, null, 2));
  await writeFile(join(outDir, "critique.json"), JSON.stringify(result.critique, null, 2));
  await writeFile(join(outDir, "compliance-flags.json"), JSON.stringify(result.flags, null, 2));
  for (const round of result.critique) {
    console.log(`Critique round ${round.round}: ${round.summary}`);
    for (const c of round.changes)
      console.log(`  slide ${c.slide + 1} ${c.field}: "${c.from}" → "${c.to}"`);
  }
  // CLAUDE.md rule 8: compliance flags are never hidden.
  for (const f of result.flags) {
    console.log(
      `Compliance flag (${locationLabel(f.location)}): "${f.phrase}" (${f.ground}). ${f.suggestion}`,
    );
  }

  const overflow = result.slides.flatMap((s, i) => s.overflow.map((o) => `slide ${i + 1}: ${o}`));
  console.log(`Wrote ${result.slides.length} slides to ${outDir}`);
  console.log(`Tokens: ${result.usage.inputTokens} in, ${result.usage.outputTokens} out`);
  if (overflow.length > 0) {
    console.error(`Text overflow (CLAUDE.md rule 7):\n- ${overflow.join("\n- ")}`);
    process.exitCode = 1;
  }
} finally {
  await renderer.close();
}
