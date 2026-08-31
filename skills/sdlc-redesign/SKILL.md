---
name: sdlc-redesign
description: Run the full gated SDLC pipeline for redesigning an existing site or screen, from audit through ship. User-invoked only — call it by name when a redesign is big enough to want a plan/review/ship trail, not for a quick one-off polish pass.
disable-model-invocation: true
---

# SDLC: Redesign

Thin entry point into `sdlc-pipeline` for `kind: redesign`. Kept user-invoked deliberately, same
reasoning as `sdlc-new-feature`: `redesign-skill` already owns the natural-language trigger for
"make this look better" / "redesign this page," so this skill never fires alongside it — it's a
separate, explicitly-chosen door into the same eventual audit-and-upgrade work, wrapped in the
pipeline's sizing and gates.

1. Capture what's being redesigned (URL, file, or screen) and what's driving it, in the user's
   own words.
2. Derive a short kebab-case `slug` for it. Ask if nothing obvious presents itself.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: redesign`, the `request`, and the
   `slug`.

Do no auditing, design, or implementation work yourself here. `sdlc-pipeline`'s Design phase
runs `redesign-skill` in place of the forward design pipeline for this kind — it audits the
existing surface first, then applies the same direction/craft/audit steps without breaking
functionality.
