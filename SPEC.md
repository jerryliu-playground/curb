# Curb — Listing to Instagram generator

> Working name ("curb appeal"). A small tool that turns a real-estate listing (photos + details + agent branding) into a polished, on-brand Instagram carousel, and later a short reel, using an LLM agent loop, a reusable template system and headless-browser rendering. Every output passes through human review before export.

## 1. Why this project exists

Two goals, equally important:

1. **Product goal:** show a generative media pipeline that produces customer-ready social content for luxury real-estate agents: photo understanding, structured content planning, template rendering, a self-critique loop, and an evaluation suite.
2. **Engineering goal:** build it end to end with Claude Code inside a deliberate harness (context files, skills, ADRs, typed and tested CI), the same way as Margin. The harness is a deliverable and is documented in the README.

The finished project should be demoable in 2 minutes: pick a listing → watch the agent plan and render → review and tweak → export a carousel (and a reel in Phase 4).

## 2. Non-goals

- Not a social media scheduler. No posting to Instagram, no Meta API.
- Not a design editor. Users tweak copy and choices, not pixel layouts.
- No multi-user auth or billing.
- No scraping of real MLS listings. Sample data uses royalty-free photos and invented listings.

## 3. User and core scenario

A real-estate agent (or the marketing person at a brokerage) has a new listing. They:

1. Open Curb, choose a sample listing or upload photos and fill in details (address, price, beds, baths, square footage, description, highlights).
2. Pick a brand kit (agent name, logo, colors, fonts) and a template style.
3. Click **Generate**. The agent analyzes the photos, plans the carousel, renders it, critiques its own render, and fixes problems.
4. Review the slides. For any slide: edit the copy, swap the photo, or ask the agent to regenerate it with a note ("make this one about the kitchen").
5. Approve and export a ZIP: slide PNGs (1080×1350), caption, hashtags, alt text.

## 4. Pipeline

```
listing + photos + brand kit
        │
        ▼
1. Photo analysis        Claude vision → PhotoAnalysis[] (room type, key features, quality score, hero suitability, focal point)
        │
        ▼
2. Carousel plan         Claude structured output → CarouselPlan (6–10 slides: type, photo, headline, body, layout hints) + caption + hashtags + alt text
        │
        ▼
3. Render                React template components → HTML → Playwright screenshots at 1080×1350
        │
        ▼
4. Critique loop         Claude vision reviews each rendered slide against a checklist → fixes → re-render (max 2 rounds)
        │
        ▼
5. Human review          UI: edit / swap / regenerate per slide → approve → export
```

### Slide types
`cover` (hero photo, price, address), `feature` (one room + one highlight), `stats` (beds/baths/sqft/lot), `gallery` (2–3 photo grid), `neighbourhood` (text over photo), `cta` (agent card, contact, "Book a showing").

### Templates
Three styles sharing one slide-type contract: **Classic** (serif, white space), **Modern** (bold sans, full-bleed photos), **Editorial** (magazine layout). Brand-kit tokens (colors, fonts, logo) are injected as CSS variables. Adding a template must not require changing the pipeline.

### Critique checklist (step 4)
- Text fits its box (no overflow or clipping; also checked deterministically from DOM measurements).
- Legibility: enough contrast between text and the photo behind it.
- The photo's focal point is not covered by text or cropped out.
- Headline matches the photo on the slide.
- Brand consistency across slides.

### Compliance check
Real-estate ads must avoid discriminatory language (e.g. U.S. Fair Housing Act; Canadian provincial human rights codes). A deterministic word-list check plus an LLM check flags phrases like "perfect for young families" or "exclusive neighbourhood" and proposes neutral alternatives. Flags are shown to the user before export.

## 5. Features by phase

**Phase 0 — Harness and skeleton**
- pnpm monorepo, TypeScript strict, ESLint, Prettier, Vitest, Playwright, GitHub Actions CI.
- CLAUDE.md, docs/ (architecture, domain glossary, ADRs), first skills.
- Done when `pnpm check` passes in CI on an empty app.

**Phase 1 — Carousel pipeline as a CLI**
- `pnpm generate --listing samples/01` runs steps 1–3 and writes PNGs, caption and hashtags to `out/`.
- zod schemas for every model output; invalid output is retried once with the validation error, then fails loudly.
- One template (Modern) fully working; 5 seeded sample listings.
- Done when all 5 samples render without overflow.

**Phase 2 — Critique loop and review UI**
- Step 4 critique loop with a round limit and a log of what changed per round.
- React review UI: slide strip, per-slide edit / swap photo / regenerate with note, approve, export ZIP.
- Classic and Editorial templates.
- Compliance check with flags in the UI.

**Phase 3 — Evals**
- `pnpm eval` runs the pipeline over the 5–10 sample listings and writes a scored report (`evals/report.md`):
  - Deterministic: text overflow, character limits, slide count, hashtag count, compliance flags, every photo used at most once.
  - LLM-as-judge with a written rubric: headline quality, accuracy against the listing facts (no invented features), brand voice.
- Track scores over time so prompt changes can be compared.

**Phase 4 — Reel (optional)**
- 15–20 second vertical video (1080×1920): Ken Burns pans over the chosen photos, animated captions, an AI voiceover (ElevenLabs text-to-speech) and background music, composited with ffmpeg (or Shotstack).
- Optional: one generated establishing shot with Veo.

**Phase 5 — Showcase**
- Deployed demo with sample listings only and rate limiting.
- README with screenshots, the pipeline diagram, eval results and the harness write-up. A 2-minute demo video.

## 6. Architecture

```
curb/
├── apps/
│   ├── web/        React · Vite · review UI
│   └── server/     Node · Fastify · pipeline API · job status via SSE
├── packages/
│   ├── pipeline/   steps 1–4 as pure, testable functions around a model client interface
│   ├── templates/  React slide components + brand-kit tokens; render-to-HTML helpers
│   ├── renderer/   Playwright rendering (HTML → PNG), DOM overflow measurement
│   └── shared/     types, zod schemas, compliance word list
├── evals/          eval runner, rubric, sample listings, reports
├── samples/        sample listings with royalty-free photos
├── docs/           architecture.md, domain.md, adr/, harness-log.md
├── CLAUDE.md
└── SPEC.md
```

- **Model client interface:** the pipeline talks to a small `ModelClient` interface, never to an SDK directly. Tests use a recorded/mocked client.
- **Long-running jobs:** generation runs as a job with progress events streamed to the UI (SSE). No queue infrastructure; one process is enough.
- **Storage:** local filesystem for uploads and outputs; SQLite only if job history is needed.

### Suggested choices (confirm in Phase 0, record each as an ADR)
- Claude API for vision and structured output (check current model names and the structured-output / tool-use docs).
- Playwright for rendering (`page.setContent` + `page.screenshot` at exact viewport size).
- ffmpeg for the reel; ElevenLabs for voice (check current API docs).
- Fonts: open-licensed (Google Fonts) bundled locally so renders are deterministic.

## 7. Security and cost rules
- API keys only on the server, read from environment variables. Never in the client bundle or logs.
- Downscale photos before sending to the model. Cache photo analysis by image hash.
- Cap tokens per request, rounds per critique loop, and generations per minute on the demo.
- Uploaded files: images only, size-limited, re-encoded before use.

## 8. The harness

### Guides
- **CLAUDE.md:** rules, commands, definition of done, boundaries.
- **docs/architecture.md**, **docs/domain.md** (listing, photo analysis, slide, plan, template, brand kit, critique round, compliance flag), **docs/adr/**.
- **Skills** (`.claude/skills/`):
  - `add-slide-type`: schema → plan prompt → component in every template → render test → eval check.
  - `add-template`: implement every slide type, brand tokens, visual snapshot tests.
  - `tune-prompt`: change a prompt, run `pnpm eval`, compare against the last report, record the result.

### Sensors
- Typecheck, lint (boundary rules: `packages/templates` has no model or I/O code; `apps/web` never imports server code).
- Unit tests for schemas, compliance check, layout helpers.
- Render tests: every slide type × every template renders sample data with no DOM overflow.
- Visual snapshot tests for templates (Playwright screenshots, tolerance-based).
- Pipeline tests with the mocked model client. No test calls a real API.
- `pnpm eval` as the quality gate for prompt changes.

### Steering loop
- `docs/harness-log.md`: when the agent makes the same mistake twice, record it and the guide or sensor added.

## 9. Resume line (target)

> **Listing-to-Instagram generator** (TypeScript, Claude API, Playwright, React): an agentic pipeline that analyzes listing photos, plans on-brand carousels with structured outputs, renders them through a reusable template system with headless Chromium, and self-critiques its renders before human review. Includes a fair-housing compliance check and an eval suite that scores every prompt change.

## 10. Open questions (decide in Phase 0)
- Structured output via tool use vs. a JSON-schema response mode: which is more reliable for the plan step today?
- Render React to HTML with `renderToStaticMarkup` vs. serving a small render route: which is simpler and deterministic?
- Shotstack vs. ffmpeg for the reel: ffmpeg is free and local; Shotstack matches the target company's stack.
