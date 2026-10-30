# 0010. ElevenLabs for the reel voiceover

- Status: Accepted (applies from Phase 4)
- Date: 2026-10-29

## Context

The Phase 4 reel needs a short AI voiceover read from the generated caption.

## Decision

- Use ElevenLabs text-to-speech through the official JS SDK `@elevenlabs/elevenlabs-js` (added in Phase 4). Endpoint: `POST /v1/text-to-speech/{voice_id}`.
- Model: start with `eleven_multilingual_v2` (stable, the API default); compare `eleven_v4` on quality before the demo. `eleven_turbo_v2*` are deprecated and not used.
- Same rules as the model client: the key (`ELEVENLABS_API_KEY`) is read only in `apps/server`, the call sits behind an interface, and tests use a recorded audio fixture.
- Voiceover text goes through the same compliance check as the caption.

## Consequences

- Another paid API with its own budget cap (characters per reel).
- Sources: elevenlabs.io/docs (text-to-speech convert, models overview); npm registry for the SDK package. Checked 2026-10-29. Re-check the SDK and model IDs when Phase 4 starts.
