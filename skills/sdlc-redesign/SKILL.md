---
name: sdlc-redesign
description: Run the full gated, multi-phase SDLC pipeline for redesigning an existing site or screen — audit through ship, approval required after every phase. Use when the user explicitly wants the whole supervised trail (plan, review, ship) for a redesign, not just a one-off polish pass; redesign-skill still owns a bare "make this look better."
---

# SDLC: Redesign

Thin entry point into `sdlc-pipeline` for `kind: redesign`. This fires only when the request is
explicitly for the whole supervised trail — `redesign-skill` still owns a bare "make this look
better" with no ask for plan/review/ship. When in doubt about which the user wants, ask rather
than guessing.

1. Capture what's being redesigned (URL, file, or screen) and what's driving it, in the user's
   own words.
2. Derive a short kebab-case `slug` for it. If nothing obvious presents itself, offer 2-3
   candidates through the `AskUserQuestion` tool rather than asking in plain text.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: redesign`, the `request`, and the
   `slug`.

Do no auditing, design, or implementation work yourself here. `sdlc-pipeline`'s Design phase
runs `redesign-skill` in place of the forward design pipeline for this kind — it audits the
existing surface first, then applies the same direction/craft/audit steps without breaking
functionality.
