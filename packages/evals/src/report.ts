import { locationLabel } from "@curb/shared";
import { passesDeterministic } from "./deterministic.ts";
import { BLOCKING_METRICS, invented, METRICS, type Metric, trend } from "./metrics.ts";
import { EVAL_RUN_FORMAT, type EvalRun, type ListingEval } from "./types.ts";

const TREND_MARK = { better: "▲ better", worse: "▼ worse", same: "=", "n/a": "" } as const;
const TREND_RUNS = 10;

/** The latest earlier run that can be compared with `run`: same format and mode. */
export function previousRun(run: EvalRun, history: readonly EvalRun[]): EvalRun | undefined {
  return history
    .filter((h) => h.format === EVAL_RUN_FORMAT && h.mode === run.mode && h.id < run.id)
    .sort((a, b) => a.id.localeCompare(b.id))
    .at(-1);
}

function show(metric: Metric, value: number | null): string {
  return value === null ? "–" : metric.format(value);
}

function promptList(prompts: Record<string, number>): string {
  return Object.entries(prompts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, v]) => `${name} v${v}`)
    .join(", ");
}

/** Things that make a comparison with `before` misleading, in plain words. */
export function comparisonNotes(run: EvalRun, before: EvalRun): string[] {
  const notes: string[] = [];
  const changed = Object.keys({ ...before.prompts, ...run.prompts })
    .filter((name) => before.prompts[name] !== run.prompts[name])
    .sort()
    .map((name) => `${name} v${before.prompts[name] ?? "–"} → v${run.prompts[name] ?? "–"}`);
  if (changed.length > 0) notes.push(`Prompt changes: ${changed.join(", ")}.`);
  if (before.model !== run.model) notes.push(`Model changed: ${before.model} → ${run.model}.`);
  if (
    before.judgeModel !== run.judgeModel ||
    before.prompts["eval-judge"] !== run.prompts["eval-judge"]
  ) {
    notes.push("The judge changed, so judge scores are not directly comparable.");
  }
  const ids = (r: EvalRun) =>
    r.listings
      .map((l) => l.id)
      .sort()
      .join(",");
  if (ids(before) !== ids(run)) notes.push("The runs cover different listings.");
  return notes;
}

function listingRow(l: ListingEval): string {
  const d = l.deterministic;
  const tokens = l.usage.inputTokens + l.usage.outputTokens;
  if (l.status === "failed" || !d) {
    return `| ${l.id} | failed | – | – | – | – | – | – | – | – | – | ${tokens.toLocaleString("en-CA")} |`;
  }
  const overflow = Object.values(d.overflow).reduce((n, boxes) => n + boxes.length, 0);
  const j = l.judge;
  const judgeCell = (v: number | undefined) => (v === undefined ? "–" : String(v));
  return [
    "",
    l.id,
    "ok",
    passesDeterministic(d) ? "yes" : "**no**",
    overflow,
    d.ruleProblems.length + d.reusedPhotos.length,
    d.complianceFlags.wordList + d.complianceFlags.model,
    `${d.roomTypes.correct}/${d.roomTypes.total}`,
    judgeCell(j?.headlineQuality.score),
    judgeCell(j?.accuracy.score),
    j
      ? `${j.accuracy.unsupportedClaims.length}${l.claims ? ` (${invented(l.claims)} invented)` : ""}`
      : "–",
    judgeCell(j?.brandVoice.score),
    tokens.toLocaleString("en-CA"),
    "",
  ]
    .join(" | ")
    .trim();
}

function details(l: ListingEval): string[] {
  const lines = [`### ${l.id}: ${l.title}`, ""];
  if (l.status === "failed") {
    lines.push("Generation failed:", "", "```", l.error ?? "unknown error", "```", "");
    return lines;
  }
  const d = l.deterministic;
  const items: string[] = [];
  if (d) {
    for (const [template, boxes] of Object.entries(d.overflow)) {
      for (const box of boxes) items.push(`Overflow (${template}): ${box}`);
    }
    for (const p of d.ruleProblems) items.push(`Rule problem: ${p}`);
    for (const f of d.reusedPhotos) items.push(`Reused photo: ${f}`);
    for (const m of d.roomTypes.mismatches) items.push(`Room type: ${m}`);
  }
  for (const f of l.flags ?? []) {
    items.push(
      `Compliance flag (${f.source}, ${locationLabel(f.location)}): "${f.phrase}" (${f.ground})`,
    );
  }
  if (l.claims) {
    // Worst first: claims nothing upstream backs were invented while planning.
    for (const { claim: c } of l.claims.filter((x) => x.fromPhotoAnalysis.length === 0)) {
      items.push(
        `**Invented claim** (${locationLabel(c.location)}): "${c.claim}". ${c.why} Not in the labels or the photo analysis.`,
      );
    }
    for (const { claim: c, fromPhotoAnalysis } of l.claims.filter(
      (x) => x.fromPhotoAnalysis.length > 0,
    )) {
      items.push(
        `Claim from photo analysis (${locationLabel(c.location)}): "${c.claim}". ${c.why} ` +
          `Likely from: ${fromPhotoAnalysis.map((f) => `"${f}"`).join(", ")}. ` +
          "Check the photo: if it's there, add it to labels.json; if not, the analysis was wrong.",
      );
    }
  } else if (l.judge) {
    for (const c of l.judge.accuracy.unsupportedClaims) {
      items.push(`Unsupported claim (${locationLabel(c.location)}): "${c.claim}". ${c.why}`);
    }
  }
  if (l.judgeError) items.push(`Judge failed: ${l.judgeError}`);
  lines.push(...(items.length > 0 ? items.map((i) => `- ${i}`) : ["- No problems found."]), "");

  if (l.judge) {
    const j = l.judge;
    lines.push(
      `Judge notes: headline ${j.headlineQuality.score}/5: ${j.headlineQuality.reason} ` +
        `Accuracy ${j.accuracy.score}/5: ${j.accuracy.reason} ` +
        `Brand voice ${j.brandVoice.score}/5: ${j.brandVoice.reason}`,
      "",
    );
  }
  return lines;
}

/**
 * The eval report (`evals/report.md`): this run's summary compared with the previous comparable
 * run, a row per listing, the details behind every problem, and the trend over recent runs.
 */
export function renderReport(run: EvalRun, history: readonly EvalRun[]): string {
  const before = previousRun(run, history);
  const total = (pick: (l: ListingEval) => number) =>
    run.listings.reduce((n, l) => n + pick(l), 0).toLocaleString("en-CA");

  const lines: string[] = [
    "# Eval report",
    "",
    "Generated by `pnpm eval`. Don't edit by hand. Rubric: `packages/pipeline/prompts/eval-judge.v*.md`.",
    "",
    `- Run: \`${run.id}\` (${run.startedAt}), commit \`${run.commit}\``,
    `- Mode: ${run.mode === "mock" ? "mock model (no API calls; scores only test the harness)" : "real model"}`,
    `- Model: \`${run.model}\`, judge: ${run.judgeModel ? `\`${run.judgeModel}\`` : "skipped"}`,
    `- Prompts: ${promptList(run.prompts)}`,
    `- Listings: ${run.listings.map((l) => l.id).join(", ")}; overflow checked in ${run.templates.join(", ")}`,
    `- Tokens: pipeline ${total((l) => l.usage.inputTokens)} in / ${total((l) => l.usage.outputTokens)} out; ` +
      `judge ${total((l) => l.judgeUsage?.inputTokens ?? 0)} in / ${total((l) => l.judgeUsage?.outputTokens ?? 0)} out`,
    "",
    "## Summary",
    "",
  ];

  if (before) {
    lines.push(`Compared with run \`${before.id}\` (commit \`${before.commit}\`).`, "");
    for (const note of comparisonNotes(run, before)) lines.push(`- ${note}`);
    lines.push("");
  } else {
    lines.push("No earlier run to compare with.", "");
  }

  lines.push("| Metric | This run | Previous | Change |", "| --- | --- | --- | --- |");
  const regressions: string[] = [];
  for (const m of METRICS) {
    const now = m.value(run);
    const was = before ? m.value(before) : null;
    const t = trend(m, was, now);
    if (t === "worse" && BLOCKING_METRICS.includes(m.key)) regressions.push(m.label);
    lines.push(`| ${m.label} | ${show(m, now)} | ${show(m, was)} | ${TREND_MARK[t]} |`);
  }
  lines.push("");
  if (regressions.length > 0) {
    lines.push(
      `**Blocking regression:** ${regressions.join(", ")} got worse. A prompt change that causes this is not kept (tune-prompt skill).`,
      "",
    );
  }

  lines.push(
    "## Per listing",
    "",
    "| Listing | Status | Pass | Overflow | Rule problems | Flags | Room types | Headline | Accuracy | Claims | Voice | Tokens |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...run.listings.map(listingRow),
    "",
    "## Details",
    "",
    ...run.listings.flatMap(details),
  );

  const recent = [
    ...history.filter(
      (h) => h.format === EVAL_RUN_FORMAT && h.mode === run.mode && h.id !== run.id,
    ),
    run,
  ]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-TREND_RUNS);
  const trendMetrics = [
    "completed",
    "deterministicPass",
    "accuracy",
    "unsupportedClaims",
    "inventedClaims",
    "headline",
    "brandVoice",
  ]
    .map((key) => METRICS.find((m) => m.key === key))
    .filter((m): m is Metric => m !== undefined);
  lines.push(
    `## Trend (last ${recent.length} ${run.mode} runs)`,
    "",
    `| Run | Commit | Prompts | ${trendMetrics.map((m) => m.label).join(" | ")} |`,
    `| --- | --- | --- | ${trendMetrics.map(() => "---").join(" | ")} |`,
    ...recent.map(
      (r) =>
        `| \`${r.id}\` | \`${r.commit}\` | ${promptList(r.prompts)} | ${trendMetrics.map((m) => show(m, m.value(r))).join(" | ")} |`,
    ),
    "",
  );
  return lines.join("\n");
}
