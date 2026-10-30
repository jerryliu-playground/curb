import { z } from "zod";
import type { CarouselPlan } from "./carousel.ts";

/**
 * Grounds that housing ads must not express a preference about: the U.S. Fair Housing Act and the
 * Ontario Human Rights Code (housing), which also covers age, marital status and receipt of
 * public assistance. The list is deliberately conservative: a flag is a prompt for a human to
 * look, not a verdict. Flags are always shown before export (CLAUDE.md rule 8).
 */
export const COMPLIANCE_GROUNDS = [
  "family status",
  "age",
  "disability",
  "creed",
  "race or origin",
  "sex",
  "marital status",
  "public assistance",
] as const;
export type ComplianceGround = (typeof COMPLIANCE_GROUNDS)[number];

interface WordListEntry {
  /** Regex source, matched case-insensitively on word boundaries. */
  pattern: string;
  ground: ComplianceGround;
  suggestion: string;
}

export const COMPLIANCE_WORD_LIST: readonly WordListEntry[] = [
  {
    pattern: "perfect for (young )?famil(y|ies)",
    ground: "family status",
    suggestion: 'Describe the space, e.g. "four bedrooms".',
  },
  {
    pattern: "ideal for (young )?famil(y|ies)",
    ground: "family status",
    suggestion: 'Describe the space, e.g. "four bedrooms".',
  },
  {
    pattern: "great for (kids|children)",
    ground: "family status",
    suggestion: 'Describe the feature, e.g. "large fenced yard".',
  },
  {
    pattern: "family[- ]friendly",
    ground: "family status",
    suggestion: "Describe the feature itself.",
  },
  {
    pattern: "no (kids|children)",
    ground: "family status",
    suggestion: "Remove; occupancy can't be limited by family status.",
  },
  { pattern: "adults? only", ground: "age", suggestion: "Remove the restriction." },
  {
    pattern: "empty[- ]nesters?",
    ground: "family status",
    suggestion: 'Describe the space, e.g. "low-maintenance".',
  },
  {
    pattern: "bachelor pad",
    ground: "marital status",
    suggestion: 'Use "studio" or describe the space.',
  },
  {
    pattern: "(couples?|singles?) only",
    ground: "marital status",
    suggestion: "Remove the restriction.",
  },
  {
    pattern: "(newlyweds?|married couples?)",
    ground: "marital status",
    suggestion: "Describe the space instead of the buyer.",
  },
  {
    pattern: "mature (couples?|adults?|tenants?|buyers?)",
    ground: "age",
    suggestion: "Describe the space instead of the buyer.",
  },
  {
    pattern: "young professionals?",
    ground: "age",
    suggestion: 'Describe the feature, e.g. "home office".',
  },
  { pattern: "(seniors?|retirees?) only", ground: "age", suggestion: "Remove the restriction." },
  {
    pattern: "perfect for (seniors|retirees)",
    ground: "age",
    suggestion: 'Describe the feature, e.g. "single-level living".',
  },
  {
    pattern: "able[- ]bodied",
    ground: "disability",
    suggestion: 'Describe the feature, e.g. "two flights of stairs".',
  },
  {
    pattern: "no (wheelchairs|service animals)",
    ground: "disability",
    suggestion: "Remove the restriction.",
  },
  {
    pattern: "handicap(ped)?",
    ground: "disability",
    suggestion: 'Use "accessible" and name the feature.',
  },
  {
    pattern: "walking distance",
    ground: "disability",
    suggestion:
      'Give the distance, e.g. "500 m from the station", only if it\'s in the listing data.',
  },
  {
    pattern:
      "(christian|jewish|muslim|catholic) (home|neighbourhood|neighborhood|community|family)",
    ground: "creed",
    suggestion: "Remove the reference to religion.",
  },
  {
    pattern: "near (the )?(church|synagogue|mosque|temple)",
    ground: "creed",
    suggestion: "Remove, or name the street instead.",
  },
  {
    pattern: "exclusive (neighbourhood|neighborhood|community|area|enclave|street)",
    ground: "race or origin",
    suggestion: 'Describe the setting, e.g. "quiet crescent".',
  },
  {
    pattern: "(ethnic|integrated|traditional) (neighbourhood|neighborhood|community)",
    ground: "race or origin",
    suggestion: "Describe the setting without reference to residents.",
  },
  {
    pattern: "(english|canadian)[- ](speaking|born)",
    ground: "race or origin",
    suggestion: "Remove the reference to language or origin.",
  },
  {
    pattern: "(men|women|male|female|gentlemen|ladies) only",
    ground: "sex",
    suggestion: "Remove the restriction.",
  },
  {
    pattern: "ideal for (a )?(man|woman|gentleman|lady)",
    ground: "sex",
    suggestion: "Describe the space instead of the buyer.",
  },
  {
    pattern: "no (welfare|odsp|social assistance|section 8)",
    ground: "public assistance",
    suggestion: "Remove the restriction.",
  },
  {
    pattern: "(professionals|employed) only",
    ground: "public assistance",
    suggestion: "Remove the restriction.",
  },
];

/** Where a piece of copy lives: a slide field, the caption or the hashtags. */
export const CopyLocationSchema = z.strictObject({
  slide: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("0-based slide index, or null for caption/hashtags."),
  field: z.enum(["headline", "body", "altText", "caption", "hashtags"]),
});
export type CopyLocation = z.infer<typeof CopyLocationSchema>;

export interface CopyText {
  location: CopyLocation;
  text: string;
}

export interface ComplianceFlag {
  /** Stable for the same location + phrase, so the UI can track which flags were shown. */
  id: string;
  location: CopyLocation;
  phrase: string;
  ground: string;
  reason: string;
  suggestion: string;
  source: "word-list" | "model";
}

/** Every piece of copy in a plan, in display order. */
export function planCopy(plan: CarouselPlan): CopyText[] {
  const texts: CopyText[] = [];
  plan.slides.forEach((slide, i) => {
    texts.push({ location: { slide: i, field: "headline" }, text: slide.headline });
    if ("body" in slide) texts.push({ location: { slide: i, field: "body" }, text: slide.body });
    texts.push({ location: { slide: i, field: "altText" }, text: slide.altText });
  });
  texts.push({ location: { slide: null, field: "caption" }, text: plan.caption });
  texts.push({ location: { slide: null, field: "hashtags" }, text: plan.hashtags.join(" ") });
  return texts;
}

export function locationKey(location: CopyLocation): string {
  return location.slide === null ? location.field : `slide${location.slide}.${location.field}`;
}

export function locationLabel(location: CopyLocation): string {
  const field = location.field === "altText" ? "alt text" : location.field;
  return location.slide === null ? field : `Slide ${location.slide + 1} ${field}`;
}

export function flagId(location: CopyLocation, phrase: string): string {
  return `${locationKey(location)}:${phrase.toLowerCase().replace(/\s+/g, "-")}`;
}

const COMPILED = COMPLIANCE_WORD_LIST.map((entry) => ({
  ...entry,
  regex: new RegExp(`\\b${entry.pattern}\\b`, "gi"),
}));

/** Deterministic word-list check over the given copy. */
export function checkComplianceWordList(texts: readonly CopyText[]): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  for (const { location, text } of texts) {
    for (const entry of COMPILED) {
      for (const match of text.matchAll(entry.regex)) {
        flags.push({
          id: flagId(location, match[0]),
          location,
          phrase: match[0],
          ground: entry.ground,
          reason: `May express a preference based on ${entry.ground}.`,
          suggestion: entry.suggestion,
          source: "word-list",
        });
      }
    }
  }
  return flags;
}

/** Combines flag lists, dropping duplicates for the same location and phrase (first wins). */
export function mergeFlags(...lists: readonly ComplianceFlag[][]): ComplianceFlag[] {
  const seen = new Map<string, ComplianceFlag>();
  for (const flag of lists.flat()) if (!seen.has(flag.id)) seen.set(flag.id, flag);
  return [...seen.values()];
}
