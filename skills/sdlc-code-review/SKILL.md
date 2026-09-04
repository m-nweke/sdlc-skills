---
name: sdlc-code-review
description: Review a diff, branch, PR, or the current working-tree changes against this repo's own standards (including the Ponytail minimalism ladder) and the spec it's answering, fanning out to UI and security specialists when the change touches them. Use when asked to review code, review a PR/branch/diff, or self-review before committing or shipping. Report-only — use sdlc-simplify to act on cleanup findings.
---

# SDLC Code Review

Report-only review of a code change. Composes this repo's own review mechanism with
the specialists a change might also need, so nothing gets re-derived ad hoc each time.

## 1 — Pin the target

A fixed point, branch, or PR the user named; otherwise the current uncommitted diff if
one exists. Ask if genuinely ambiguous.

## 2 — Run the core review

Call the Skill tool with `scoville-code-anti-ai-slop`, framed as a review of the pinned
target. This runs its two-axis Standards+Spec mechanism: Standards carries the Fowler
smell baseline plus the Over-Built Solution check (the Ponytail priority ladder — skip,
reuse, built-in, only then custom); Spec checks the diff against the originating issue
or spec.

## 3 — Fan out when the change warrants it

- Touches UI or rendered output → also call `scoville-ui-anti-ai-slop`.
- Hits High risk per scoville-code-anti-ai-slop's risk state (auth, payments, secrets,
  migrations, destructive behavior, live systems) → also call `security-review`. Once
  High is hit this is mandatory, not optional.
- The Standards axis surfaces a real shallow-module or deepening concern, not just a
  local smell → note it as a candidate for `improve-codebase-architecture`. Don't run
  that skill automatically; it owns its own report-and-grill flow the user opts into.

## 4 — Aggregate

Present each axis and specialist under its own heading, unmerged — a change can pass
one cleanly and fail another, and collapsing them hides that. Close with one summary
line: total findings per axis, worst issue per axis. Never rank across axes.
