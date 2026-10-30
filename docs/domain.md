# Domain glossary

Use these names in code, prompts, docs and UI copy (CLAUDE.md, Style).

| Term                | Meaning                                                                                                                                          | In code (planned) |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| **Listing**         | One property for sale: address, price, beds, baths, square footage, description, highlights and its photos.                                      | `Listing`         |
| **Photo analysis**  | What the model sees in one photo: room type, key features, quality score, hero suitability, focal point.                                         | `PhotoAnalysis`   |
| **Slide**           | One 1080×1350 image in the carousel. Has a slide type, a photo (or none), headline, body and layout hints.                                       | `Slide`           |
| **Slide type**      | `cover`, `feature`, `stats`, `gallery`, `neighbourhood`, `cta`. Every template implements every slide type.                                      | `SlideType`       |
| **Carousel plan**   | The model's structured plan: 6–10 slides plus caption, hashtags and alt text.                                                                    | `CarouselPlan`    |
| **Template**        | A visual style (Classic, Modern, Editorial) implemented as pure React components, one per slide type.                                            | `Template`        |
| **Brand kit**       | Agent name, logo, colours and fonts, injected into templates as CSS variables.                                                                   | `BrandKit`        |
| **Render**          | Turning a slide + template + brand kit into a PNG with Playwright, measuring DOM overflow.                                                       | `renderSlide`     |
| **Critique round**  | One pass where the model reviews rendered slides against the checklist and proposes fixes. Max 2 rounds per job.                                 | `CritiqueRound`   |
| **Compliance flag** | A phrase in the copy that may be discriminatory under fair-housing / human-rights rules, with a neutral alternative. Always shown before export. | `ComplianceFlag`  |
| **Job**             | One generation run on the server, streaming progress events over SSE.                                                                            | `Job`             |
| **Approval**        | The user's explicit OK in the UI; the only thing that unlocks export.                                                                            | —                 |

Spelling: Canadian English in user-facing copy ("neighbourhood", "colour").

## Sample data (`samples/NN/`)

Each sample is an invented Ontario listing with royalty-free photos. Files:

- `listing.json`: the listing. Fields: `id`, `status`, `address` (`street`, `city`, `province`, `postal_code`), `price_cad`, `property_type`, `beds`, `baths`, `sqft`, `description`, `highlights[]`, `review_notes[]` (notes for the owner, not listing facts).
- `labels.json`: golden labels for evals. `photos[]` with `file`, `room_type`, `visible_features[]`. Used to score photo analysis and to check "no invented facts".
- `credits.json`: per-photo `photographer`, `source`, `url`.
- Photos: `<street-slug>-NN.jpg`, max 2000 px wide, under 2 MB.

The `room_type` values in `labels.json` (`exterior_front`, `exterior_rear`, `aerial`, `entry`, `living_room`, `family_room`, `dining_room`, `kitchen`, `primary_bedroom`, `bedroom`, `bathroom`, `primary_bathroom`, `office`, `hallway`, `staircase`, `laundry`, `basement`, `garage`, `patio`, `pool`, `backyard`, `view`, `other`) are the starting point for the `PhotoAnalysis` room type enum in Phase 1.

Facts allowed in copy come only from `listing.json` fields (excluding `review_notes`) and from what is visible in the photos (CLAUDE.md rule 2).
