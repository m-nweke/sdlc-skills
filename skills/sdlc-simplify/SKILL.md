---
name: sdlc-simplify
description: Apply this repo's priority ladder and smell baseline to already-written code and edit it down — skip what isn't needed, reuse what exists, reach for a built-in feature, and only then keep custom code. Use when asked to simplify, clean up, cut bloat from, or de-scope a file, diff, or module. Quality only — it does not hunt for correctness bugs; use sdlc-code-review for that.
---

# SDLC Simplify

Edit-mode cleanup. Find where code sits on a more expensive tier of the priority
ladder than it needs to — custom where built-in would do, a new abstraction where
reuse would do — or trips a smell, and cut it back to the cheapest tier that still
meets the spec.

## 1 — Scope

Default to the current uncommitted diff in a git repo; otherwise the file, module, or
path the user named. For a large or unnamed scope, weight recently-changed hot spots
over a full sweep.

## 2 — Find candidates

Read `scoville-code-anti-ai-slop`'s [review.md](../scoville-code-anti-ai-slop/references/review.md)
smell baseline and weigh each hunk against it. Lead with **Over-Built Solution** and
**Speculative Generality** — the Ponytail ladder: skip it, reuse an existing pattern,
use a built-in feature, only then custom code — then the rest of the baseline
(Duplicated Code, Message Chains, Middle Man, Data Clumps, and so on). Skip anything
tooling already enforces or a documented repo standard endorses.

## 3 — Fix under Change discipline

Apply `scoville-code-anti-ai-slop`'s Change-mode rules
([change-workflow.md](../scoville-code-anti-ai-slop/references/change-workflow.md)):
smallest coherent diff, canonical owner, match surrounding idioms, no unrelated
cleanup, no restyling untouched code. Fix the evidenced smell; don't chase a style
preference the repo hasn't documented.

## 4 — Escalate structural finds instead of forcing them

If a candidate needs more than a local cut — it would reshape a seam, split a module,
or move a boundary — stop and surface it as a candidate for
`improve-codebase-architecture` instead of forcing it through a local edit. That skill
owns deepening work and its own report/grilling loop.

## 5 — Report

Per change: exact location, which ladder tier or smell it was, the smallest
correction made, and what's left unaddressed and why (usually "needs
`improve-codebase-architecture`" or "tooling already enforces it"). Never claim a fix
beyond what was actually edited.
