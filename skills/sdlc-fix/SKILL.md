---
name: sdlc-fix
description: Run the full gated, multi-phase SDLC pipeline for a bug fix or defect — diagnosis through ship, approval required after every phase. Use when the user explicitly wants the whole supervised trail (plan, review, ship) for a fix, not just a quick debug; diagnosing-bugs still owns a bare "this is broken, help me debug it."
---

# SDLC: Fix

Thin entry point into `sdlc-pipeline` for `kind: fix`. This fires only when the request is
explicitly for the whole supervised trail — `diagnosing-bugs` still owns a bare "this is broken,
help me debug it" with no ask for plan/review/ship. When in doubt about which the user wants,
ask rather than guessing.

1. Capture the bug report or defect in the user's own words: symptom, where it was seen, repro
   if known.
2. Derive a short kebab-case `slug` for it. Ask if nothing obvious presents itself.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: fix`, the `request`, and the
   `slug`.

Do no diagnosis, planning, or implementation work yourself here. `sdlc-pipeline` will classify
size — most fixes land as `trivial` or `small` and skip straight to Implement, where
`diagnosing-bugs` gets invoked as part of that phase's work — and gate accordingly.
