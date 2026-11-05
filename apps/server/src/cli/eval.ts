// `pnpm eval` (Phase 3, ADR 0014): runs the pipeline over the sample listings, scores every result
// (deterministic checks + LLM-as-judge) and writes evals/report.md plus evals/runs/<id>.json.
// The real model costs money; ask the owner first (tune-prompt skill). --mock runs without the
// API and writes to out/eval-mock/ so it never replaces the real report.
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  EVAL_JUDGE_PROMPT,
  EVAL_RUN_FORMAT,
  type EvalRun,
  evaluateListing,
  type ListingEval,
  renderReport,
} from "@curb/evals";
import {
  CAROUSEL_PLAN_PROMPT,
  COMPLIANCE_PROMPT,
  CRITIQUE_PROMPT,
  generateCarousel,
  type ModelClient,
  PHOTO_ANALYSIS_PROMPT,
  SLIDE_REGENERATE_PROMPT,
} from "@curb/pipeline";
import { createSampleModelClient } from "@curb/pipeline/testing";
import { launchRenderer, renderCarousel } from "@curb/renderer";
import { DEMO_BRAND_KIT, TEMPLATES } from "@curb/templates";
import { fileCache } from "../io/file-cache.ts";
import { loadPhotosForModel, slideImageForModel } from "../io/photos.ts";
import { createAnthropicModelClient, DEFAULT_MODEL } from "../model/anthropic-client.ts";
import { listSamples, loadSampleLabels } from "../samples.ts";

const USAGE =
  "Usage: pnpm eval [--listing 01 ...] [--mock] [--no-judge] [--judge-model <id>] [--no-cache] [--out evals]";

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    listing: { type: "string", multiple: true },
    mock: { type: "boolean", default: false },
    "no-judge": { type: "boolean", default: false },
    "judge-model": { type: "string", default: DEFAULT_MODEL },
    "no-cache": { type: "boolean", default: false },
    out: { type: "string" },
  },
});

// pnpm runs scripts from the package that defines them; resolve paths against where the user ran it.
const root = process.env.INIT_CWD ?? process.cwd();
const outDir = resolve(root, values.out ?? (values.mock ? "out/eval-mock" : "evals"));
const runsDir = join(outDir, "runs");

let samples = await listSamples(resolve(root, "samples"));
if (values.listing) {
  const wanted = new Set(values.listing);
  const unknown = [...wanted].filter((id) => !samples.some((s) => s.id === id));
  if (unknown.length > 0) fail(`Unknown listing(s): ${unknown.join(", ")}.`);
  samples = samples.filter((s) => wanted.has(s.id));
}
if (samples.length === 0) fail("No sample listings found in samples/.");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!values.mock && !apiKey) {
  fail("ANTHROPIC_API_KEY is not set. Set it, or use --mock to run without the API.");
}
const realClient = (model?: string): ModelClient =>
  createAnthropicModelClient({ apiKey: apiKey ?? "", ...(model ? { model } : {}) });

function gitCommit(): string {
  try {
    const hash = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root })
      .toString()
      .trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root }).toString().trim();
    return dirty ? `${hash}-dirty` : hash;
  } catch {
    return "unknown";
  }
}

const startedAt = new Date();
const runId = startedAt
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .replace(/\.\d+Z$/, "");
const judgeEnabled = !values["no-judge"];
const pipelineModel = values.mock ? "mock:sample-labels" : realClient().id;
console.log(
  `Eval ${runId}: ${samples.length} listing(s), ${values.mock ? "mock model" : pipelineModel}, ` +
    `judge ${judgeEnabled ? (values.mock ? "mock" : values["judge-model"]) : "off"}`,
);

const renderer = await launchRenderer();
const listings: ListingEval[] = [];
try {
  for (const sample of samples) {
    const labels = await loadSampleLabels(sample);
    const client = values.mock
      ? createSampleModelClient({ listing: sample.listing, labels })
      : realClient();
    const judge = !judgeEnabled
      ? undefined
      : values.mock
        ? client
        : realClient(values["judge-model"]);
    const photos = await loadPhotosForModel(sample.dir, sample.photos);
    console.log(`Listing ${sample.id}: ${sample.photos.length} photos`);

    const evaluation = await evaluateListing({
      listing: sample.listing,
      labels,
      photoFiles: sample.photos,
      ...(judge ? { judge } : {}),
      generate: () =>
        generateCarousel({
          client,
          listing: sample.listing,
          photos,
          brandKit: DEMO_BRAND_KIT,
          ...(values["no-cache"]
            ? {}
            : { cache: fileCache(resolve(root, ".cache/photo-analysis")) }),
          render: (input) =>
            renderCarousel(renderer, {
              ...input,
              template: TEMPLATES.modern,
              photoDir: sample.dir,
            }),
          prepareSlideImage: slideImageForModel,
        }),
      checkOverflow: async (result) => {
        const overflow: Record<string, string[]> = {};
        for (const [name, template] of Object.entries(TEMPLATES)) {
          const slides = await renderCarousel(renderer, {
            template,
            listing: sample.listing,
            plan: result.plan,
            analyses: result.analyses,
            brandKit: DEMO_BRAND_KIT,
            photoDir: sample.dir,
          });
          overflow[name] = slides.flatMap((s, i) => s.overflow.map((o) => `slide ${i + 1}: ${o}`));
        }
        return overflow;
      },
    });
    listings.push(evaluation);

    if (evaluation.status === "failed") {
      console.error(`  failed: ${evaluation.error}`);
    } else {
      const j = evaluation.judge;
      console.log(
        `  done in ${(evaluation.durationMs / 1000).toFixed(0)}s` +
          (j
            ? `; judge: headline ${j.headlineQuality.score}, accuracy ${j.accuracy.score}, voice ${j.brandVoice.score}`
            : evaluation.judgeError
              ? `; judge failed: ${evaluation.judgeError}`
              : ""),
      );
    }
  }
} finally {
  await renderer.close();
}

const run: EvalRun = {
  format: EVAL_RUN_FORMAT,
  id: runId,
  startedAt: startedAt.toISOString(),
  commit: gitCommit(),
  mode: values.mock ? "mock" : "real",
  model: pipelineModel,
  judgeModel: !judgeEnabled
    ? null
    : values.mock
      ? "mock:sample-labels"
      : realClient(values["judge-model"]).id,
  prompts: Object.fromEntries(
    [
      PHOTO_ANALYSIS_PROMPT,
      CAROUSEL_PLAN_PROMPT,
      CRITIQUE_PROMPT,
      COMPLIANCE_PROMPT,
      SLIDE_REGENERATE_PROMPT,
      ...(judgeEnabled ? [EVAL_JUDGE_PROMPT] : []),
    ].map((p) => [p.name, p.version]),
  ),
  templates: Object.keys(TEMPLATES),
  listings,
};

async function readHistory(): Promise<EvalRun[]> {
  let files: string[];
  try {
    files = (await readdir(runsDir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const runs = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(runsDir, f), "utf8")) as EvalRun),
  );
  // Our own files; older formats are skipped rather than misread.
  return runs.filter((r) => r.format === EVAL_RUN_FORMAT);
}

const history = await readHistory();
await mkdir(runsDir, { recursive: true });
await writeFile(join(runsDir, `${runId}.json`), JSON.stringify(run, null, 2) + "\n");
await writeFile(join(outDir, "report.md"), renderReport(run, history));
console.log(
  `Wrote ${relative(root, join(outDir, "report.md"))} and ${relative(root, join(runsDir, `${runId}.json`))}`,
);

const failed = listings.filter((l) => l.status === "failed").length;
if (failed > 0) {
  console.error(`${failed} listing(s) failed to generate; see the report.`);
  process.exitCode = 1;
}
