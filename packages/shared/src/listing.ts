import { z } from "zod";

/** Room types, from the golden labels in samples/NN/labels.json (docs/domain.md). */
export const ROOM_TYPES = [
  "exterior_front",
  "exterior_rear",
  "aerial",
  "entry",
  "living_room",
  "family_room",
  "dining_room",
  "kitchen",
  "primary_bedroom",
  "bedroom",
  "bathroom",
  "primary_bathroom",
  "office",
  "hallway",
  "staircase",
  "laundry",
  "basement",
  "garage",
  "patio",
  "pool",
  "backyard",
  "view",
  "other",
] as const;
export const RoomTypeSchema = z.enum(ROOM_TYPES);
export type RoomType = z.infer<typeof RoomTypeSchema>;

/**
 * A listing as stored in samples/NN/listing.json. Field names follow the file format.
 * `review_notes` are notes for the owner, never listing facts (CLAUDE.md rule 2).
 */
export const ListingSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(2),
    postal_code: z.string().min(1),
  }),
  price_cad: z.number().int().positive(),
  property_type: z.enum(["detached", "semi-detached", "townhouse", "condo"]),
  beds: z.number().int().nonnegative(),
  baths: z.number().nonnegative(),
  sqft: z.number().int().positive(),
  description: z.string().min(1),
  highlights: z.array(z.string().min(1)),
  review_notes: z.array(z.string()).optional(),
});
export type Listing = z.infer<typeof ListingSchema>;

/** Facts the model may use in copy: everything except owner-only fields. */
export function listingFacts(listing: Listing): Omit<Listing, "review_notes" | "status"> {
  const facts: Partial<Listing> = { ...listing };
  delete facts.review_notes;
  delete facts.status;
  return facts as Omit<Listing, "review_notes" | "status">;
}
