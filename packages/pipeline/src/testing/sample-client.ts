import {
  type CarouselPlan,
  type Listing,
  type PhotoAnalysisOutput,
  type RoomType,
  type Slide,
  LIMITS,
} from "@curb/shared";
import type { ModelClient, ModelResponse } from "../model-client.ts";

/** Golden labels from samples/NN/labels.json. */
export interface SampleLabels {
  photos: { file: string; room_type: RoomType; visible_features: string[] }[];
}

const HERO_ROOMS: readonly RoomType[] = ["exterior_front", "aerial", "view", "pool"];
const FEATURE_PRIORITY: readonly RoomType[] = [
  "kitchen",
  "living_room",
  "primary_bedroom",
  "pool",
  "family_room",
  "dining_room",
  "primary_bathroom",
  "patio",
  "backyard",
  "office",
  "entry",
];
const SETTING_ROOMS: readonly RoomType[] = ["view", "aerial", "exterior_rear", "backyard", "patio"];

const ROOM_NAMES: Record<RoomType, string> = {
  exterior_front: "The front",
  exterior_rear: "The back",
  aerial: "From above",
  entry: "The entry",
  living_room: "The living room",
  family_room: "The family room",
  dining_room: "The dining room",
  kitchen: "The kitchen",
  primary_bedroom: "The primary bedroom",
  bedroom: "The bedroom",
  bathroom: "The bathroom",
  primary_bathroom: "The primary ensuite",
  office: "The office",
  hallway: "The hallway",
  staircase: "The staircase",
  laundry: "The laundry room",
  basement: "The lower level",
  garage: "The garage",
  patio: "The patio",
  pool: "The pool",
  backyard: "The backyard",
  view: "The view",
  other: "More space",
};

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}.`;
}

function sentence(features: readonly string[], max: number): string {
  const text = features.join(", ");
  return clip(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`, max);
}

function hashtag(text: string): string {
  return `#${text.replace(/[^A-Za-z0-9]/g, "")}`;
}

/**
 * A deterministic stand-in for the model, built from a sample's golden labels. Photo analysis
 * returns the labels; the plan is assembled from labels and listing facts only, so it never
 * states anything the sample data doesn't. Used by tests and `pnpm generate --mock`.
 */
export function createSampleModelClient(sample: {
  listing: Listing;
  labels: SampleLabels;
}): ModelClient {
  const byFile = new Map(sample.labels.photos.map((p) => [p.file, p]));

  function analysis(file: string): PhotoAnalysisOutput {
    const label = byFile.get(file);
    if (!label) throw new Error(`Sample labels have no entry for ${file}.`);
    return {
      roomType: label.room_type,
      keyFeatures: label.visible_features
        .slice(0, LIMITS.maxKeyFeatures)
        .map((f) => clip(f, LIMITS.keyFeatureChars)),
      qualityScore: 4,
      heroScore:
        label.room_type === "exterior_front" ? 5 : HERO_ROOMS.includes(label.room_type) ? 4 : 2,
      focalPoint: { x: 0.5, y: 0.5 },
    };
  }

  function plan(): CarouselPlan {
    const { listing } = sample;
    const photos = sample.labels.photos;
    const used = new Set<string>();
    const take = (pick: (p: (typeof photos)[number]) => boolean) => {
      const found = photos.find((p) => !used.has(p.file) && pick(p));
      if (found) used.add(found.file);
      return found;
    };
    const alt = (p: (typeof photos)[number]) =>
      clip(
        `${ROOM_NAMES[p.room_type]}: ${p.visible_features.slice(0, 4).join(", ")}`,
        LIMITS.altTextChars,
      );

    const cover =
      take((p) => p.room_type === "exterior_front") ??
      take((p) => HERO_ROOMS.includes(p.room_type)) ??
      take(() => true);
    if (!cover) throw new Error("Sample has no photos.");

    const slides: Slide[] = [
      {
        type: "cover",
        photo: cover.file,
        headline: clip(`New in ${listing.address.city}`, LIMITS.headlineChars),
        altText: alt(cover),
      },
    ];

    const features: Slide[] = [];
    for (const room of FEATURE_PRIORITY) {
      if (features.length === 3) break;
      const p = take((x) => x.room_type === room);
      if (p) {
        features.push({
          type: "feature",
          photo: p.file,
          headline: ROOM_NAMES[room],
          body: sentence(p.visible_features.slice(0, 3), LIMITS.bodyChars),
          altText: alt(p),
        });
      }
    }
    slides.push(...features);
    slides.push({
      type: "stats",
      photo: null,
      headline: "At a glance",
      altText: `${listing.beds} bedrooms, ${listing.baths} bathrooms, ${listing.sqft} square feet.`,
    });

    const setting = take((p) => SETTING_ROOMS.includes(p.room_type));
    const gallery = [take(() => true), take(() => true), take(() => true)].filter(
      (p) => p !== undefined,
    );
    if (gallery.length >= 2) {
      slides.push({
        type: "gallery",
        photos: gallery.map((p) => p.file),
        headline: "More to see",
        altText: clip(gallery.map(alt).join(" "), LIMITS.altTextChars),
      });
    }
    if (setting) {
      slides.push({
        type: "neighbourhood",
        photo: setting.file,
        headline: clip(listing.address.city, LIMITS.headlineChars),
        body: `${listing.address.street}, ${listing.address.city}, Ontario.`,
        altText: alt(setting),
      });
    }

    // Top up with more feature slides if the sample is small, keeping room for the cta.
    while (slides.length < LIMITS.minSlides - 1) {
      const p = take(() => true);
      if (!p) break;
      slides.push({
        type: "feature",
        photo: p.file,
        headline: ROOM_NAMES[p.room_type],
        body: sentence(p.visible_features.slice(0, 3), LIMITS.bodyChars),
        altText: alt(p),
      });
    }

    const closing = take(() => true);
    slides.push({
      type: "cta",
      photo: closing?.file ?? null,
      headline: "Book a showing",
      body: "Contact us to arrange a private showing.",
      altText: closing ? alt(closing) : "Contact details for booking a showing.",
    });

    const tags = [
      hashtag(listing.address.city),
      hashtag(`${listing.address.city}RealEstate`),
      "#RealEstate",
      "#ForSale",
      "#Ontario",
      "#NewListing",
      hashtag(listing.property_type === "detached" ? "DetachedHome" : listing.property_type),
    ];

    return {
      slides,
      caption: clip(listing.description, LIMITS.captionChars),
      hashtags: [...new Set(tags)],
    };
  }

  return {
    id: "mock:sample-labels",
    generate(request): Promise<ModelResponse> {
      const usage = { inputTokens: 0, outputTokens: 0 };
      if (request.step === "photo-analysis") {
        const file = request.meta?.photo;
        if (!file) throw new Error("photo-analysis request without meta.photo");
        return Promise.resolve({ output: analysis(file), usage });
      }
      return Promise.resolve({ output: plan(), usage });
    },
  };
}
