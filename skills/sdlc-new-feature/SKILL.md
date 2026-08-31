---
name: sdlc-new-feature
description: Run the full gated, multi-phase SDLC pipeline for a new feature or product idea — discovery through ship, approval required after every phase. Use when the user explicitly wants the whole supervised build process, not just one phase of it; discovery-ideation still owns a bare "here's an idea" with no request for the full pipeline.
---

# SDLC: New Feature

Thin entry point into `sdlc-pipeline` for `kind: feature`. This fires only when the request is
explicitly for the whole supervised, multi-phase pipeline — `discovery-ideation` still owns a
bare "here's an idea" with no ask for the full trail. When in doubt about which the user wants,
ask rather than guessing: the pipeline commits to a slug and a run manifest, so starting it on
the wrong reading is more to unwind than one clarifying question.

1. Capture the raw request in the user's own words — don't paraphrase it away.
2. Derive a short kebab-case `slug` for it. If nothing obvious presents itself, offer 2-3
   candidates through the `AskUserQuestion` tool rather than asking in plain text — don't guess
   on something referenced across every phase artifact.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: feature`, the `request`, and the
   `slug`.

Do no discovery, research, design, or implementation work yourself here — that belongs to the
pipeline once it classifies size and delegates.
