# 0001. Record architecture decisions as ADRs

- Status: Accepted
- Date: 2026-10-29

## Context

Curb is built with Claude Code inside a documented harness (SPEC.md §8). Decisions about structure, dependencies and model APIs need to be findable by both people and agents, and CLAUDE.md says the stack must not change without an ADR.

## Decision

- Each decision is one Markdown file in `docs/adr/`, named `NNNN-short-title.md`, numbered in order and never renumbered.
- Sections: Context, Decision, Consequences. Keep each ADR to about a page.
- Status is `Proposed`, `Accepted`, `Deprecated` or `Superseded by NNNN`. To change a decision, write a new ADR and mark the old one superseded; don't rewrite history.
- Every new runtime or dev dependency is named in an ADR (a new one, or an amendment note on the ADR that owns that area).
- `docs/adr/README.md` keeps the index.

## Consequences

- Agents read the relevant ADRs before changing structure (CLAUDE.md).
- Small overhead per decision; reviewed in the same change as the code it explains.
