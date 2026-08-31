---
name: sdlc-fix
description: Run the full gated SDLC pipeline for a bug fix or defect, from diagnosis through ship. User-invoked only — call it by name when a fix is big enough to want a plan/review/ship trail, not for a quick one-off debug.
disable-model-invocation: true
---

# SDLC: Fix

Thin entry point into `sdlc-pipeline` for `kind: fix`. Kept user-invoked deliberately, same
reasoning as `sdlc-new-feature`: `diagnosing-bugs` already owns the natural-language trigger for
"debug this" / "something's broken," so this skill never fires alongside it — it's a separate,
explicitly-chosen door into the same eventual diagnosis work, wrapped in the pipeline's sizing
and gates.

1. Capture the bug report or defect in the user's own words: symptom, where it was seen, repro
   if known.
2. Derive a short kebab-case `slug` for it. Ask if nothing obvious presents itself.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: fix`, the `request`, and the
   `slug`.

Do no diagnosis, planning, or implementation work yourself here. `sdlc-pipeline` will classify
size — most fixes land as `trivial` or `small` and skip straight to Implement, where
`diagnosing-bugs` gets invoked as part of that phase's work — and gate accordingly.
