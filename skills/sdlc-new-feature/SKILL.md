---
name: sdlc-new-feature
description: Run the full gated SDLC pipeline for a new feature or product idea, from discovery through ship. User-invoked only — call it by name when you want the supervised pipeline rather than jumping straight into design or code.
disable-model-invocation: true
---

# SDLC: New Feature

Thin entry point into `sdlc-pipeline` for `kind: feature`. Kept user-invoked deliberately: this
repo's other model-invoked skills (`discovery-ideation`, `frontend-design`, `tdd`, ...) already
own their natural-language triggers, and firing the full gated pipeline autonomously on top of
them would compete for the same requests. Reach for this skill by name when you want the whole
supervised flow, not the ad-hoc one.

1. Capture the raw request in the user's own words — don't paraphrase it away.
2. Derive a short kebab-case `slug` for it. Ask if nothing obvious presents itself; don't guess
   on something referenced across every phase artifact.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: feature`, the `request`, and the
   `slug`.

Do no discovery, research, design, or implementation work yourself here — that belongs to the
pipeline once it classifies size and delegates.
