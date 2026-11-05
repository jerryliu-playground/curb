import type { ClaimCheck } from "./claims.ts";
import { passesDeterministic } from "./deterministic.ts";
import type { DeterministicScores, EvalRun, ListingEval } from "./types.ts";

export interface Metric {
  key: string;
  label: string;
  /** Which direction is an improvement; null for numbers that are informational only. */
  better: "higher" | "lower" | null;
  /** Null when the run has nothing to measure (e.g. no judge). */
  value: (run: EvalRun) => number | null;
  format: (value: number) => string;
}

type Ok = ListingEval & { status: "ok"; deterministic: DeterministicScores };

const ok = (run: EvalRun): Ok[] =>
  run.listings.filter((l): l is Ok => l.status === "ok" && l.deterministic !== undefined);

/** Average of `pick` over completed listings; counts become "per listing" so runs compare fairly. */
function perListing(run: EvalRun, pick: (l: Ok) => number): number | null {
  const done = ok(run);
  return done.length === 0 ? null : done.reduce((sum, l) => sum + pick(l), 0) / done.length;
}

function judged(run: EvalRun, pick: (l: Ok & { judge: NonNullable<Ok["judge"]> }) => number) {
  const done = ok(run).filter((l): l is Ok & { judge: NonNullable<Ok["judge"]> } => !!l.judge);
  return done.length === 0 ? null : done.reduce((sum, l) => sum + pick(l), 0) / done.length;
}

const overflowBoxes = (l: Ok) =>
  Object.values(l.deterministic.overflow).reduce((n, boxes) => n + boxes.length, 0);
/** Claims that neither the labels nor the photo analysis back: invented while planning. */
export const invented = (claims: readonly ClaimCheck[]) =>
  claims.filter((c) => c.fromPhotoAnalysis.length === 0).length;
const fixed1 = (v: number) => v.toFixed(1);
const fixed2 = (v: number) => v.toFixed(2);
const percent = (v: number) => `${Math.round(v * 100)}%`;
const integer = (v: number) => Math.round(v).toLocaleString("en-CA");

/** Summary metrics, in report order. Computed from the saved run, so old runs recompute the same way. */
export const METRICS: readonly Metric[] = [
  {
    key: "completed",
    label: "Listings completed",
    better: "higher",
    value: (run) => (run.listings.length === 0 ? null : ok(run).length / run.listings.length),
    format: percent,
  },
  {
    key: "deterministicPass",
    label: "Pass all deterministic checks",
    better: "higher",
    value: (run) => perListing(run, (l) => (passesDeterministic(l.deterministic) ? 1 : 0)),
    format: percent,
  },
  {
    key: "overflow",
    label: "Overflowing text boxes / listing (all templates)",
    better: "lower",
    value: (run) => perListing(run, overflowBoxes),
    format: fixed1,
  },
  {
    key: "ruleProblems",
    label: "Rule problems / listing (limits, counts, structure)",
    better: "lower",
    value: (run) => perListing(run, (l) => l.deterministic.ruleProblems.length),
    format: fixed1,
  },
  {
    key: "reusedPhotos",
    label: "Reused photos / listing",
    better: "lower",
    value: (run) => perListing(run, (l) => l.deterministic.reusedPhotos.length),
    format: fixed1,
  },
  {
    key: "complianceFlags",
    label: "Compliance flags / listing",
    better: "lower",
    value: (run) =>
      perListing(
        run,
        (l) => l.deterministic.complianceFlags.wordList + l.deterministic.complianceFlags.model,
      ),
    format: fixed1,
  },
  {
    key: "roomTypes",
    label: "Room types matching labels",
    better: "higher",
    value: (run) => {
      const totals = ok(run).reduce(
        (t, l) => ({
          correct: t.correct + l.deterministic.roomTypes.correct,
          total: t.total + l.deterministic.roomTypes.total,
        }),
        { correct: 0, total: 0 },
      );
      return totals.total === 0 ? null : totals.correct / totals.total;
    },
    format: percent,
  },
  {
    key: "headline",
    label: "Judge: headline quality (1–5)",
    better: "higher",
    value: (run) => judged(run, (l) => l.judge.headlineQuality.score),
    format: fixed2,
  },
  {
    key: "accuracy",
    label: "Judge: accuracy, no invented facts (1–5)",
    better: "higher",
    value: (run) => judged(run, (l) => l.judge.accuracy.score),
    format: fixed2,
  },
  {
    key: "unsupportedClaims",
    label: "Judge: unsupported claims / listing",
    better: "lower",
    value: (run) => judged(run, (l) => l.judge.accuracy.unsupportedClaims.length),
    format: fixed1,
  },
  {
    key: "inventedClaims",
    label: "Invented claims / listing (not in labels or photo analysis)",
    better: "lower",
    value: (run) => {
      const done = ok(run).filter((l) => l.claims !== undefined);
      return done.length === 0
        ? null
        : done.reduce((n, l) => n + invented(l.claims ?? []), 0) / done.length;
    },
    format: fixed1,
  },
  {
    key: "brandVoice",
    label: "Judge: brand voice (1–5)",
    better: "higher",
    value: (run) => judged(run, (l) => l.judge.brandVoice.score),
    format: fixed2,
  },
  {
    key: "critiqueChanges",
    label: "Critique changes / listing",
    better: null,
    value: (run) => perListing(run, (l) => l.deterministic.critique.changes),
    format: fixed1,
  },
  {
    key: "tokens",
    label: "Pipeline tokens / listing (in + out)",
    better: "lower",
    value: (run) => perListing(run, (l) => l.usage.inputTokens + l.usage.outputTokens),
    format: integer,
  },
];

export type Trend = "better" | "worse" | "same" | "n/a";

/** How a metric moved from `before` to `after`. Differences below 0.005 count as the same. */
export function trend(metric: Metric, before: number | null, after: number | null): Trend {
  if (before === null || after === null || metric.better === null) return "n/a";
  if (Math.abs(after - before) < 0.005) return "same";
  return after > before === (metric.better === "higher") ? "better" : "worse";
}

/**
 * Metrics that block a prompt change when they get worse (tune-prompt skill): accuracy and
 * compliance.
 */
export const BLOCKING_METRICS: readonly string[] = [
  "accuracy",
  "unsupportedClaims",
  "inventedClaims",
  "complianceFlags",
];
