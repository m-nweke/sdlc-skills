# sdlc-skills

Personal library of Claude Code skills and agents spanning the software development
lifecycle: discovery/ideation, research, design, code architecture, implementation,
QA, and deployment/shipping.

Skills here are the source of truth. Each is symlinked into `~/.claude/skills/<name>`
so Claude Code loads it globally. Agents (once defined) live in `agents/` and are
symlinked into `~/.claude/agents/<name>.md` the same way.

## Skills

Authored here:
- `discovery-ideation` — frames a raw idea/problem into a grilled, written brief

Vendored from [benjaminstelzer/scoville-*](https://github.com/benjaminstelzer):
- `scoville-research` — evidence-first research; extended with background-agent
  delegation + saved-markdown-file persistence for lighter (non-Deep) runs
- `scoville-code-anti-ai-slop` — goal-first guardrail for planning/changing/testing/
  reviewing code; absorbed Matt Pocock's `code-review` two-axis (Standards + Spec)
  diff-review mechanism as `references/review.md`, invoked for the review outcome
- `scoville-ui-anti-ai-slop` — framework-aware guardrail for UI implementation/audit

Vendored from [bendrape1-byte/silk-design](https://github.com/bendrape1-byte/silk-design):
- `silk-design` — motion/polish-by-default web UI building (design branch)

Vendored from [anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md):
- `frontend-design` — aesthetic direction, typography, and non-templated visual
  design choices (design branch)

Vendored from Matt Pocock's skills plugin:
- `grilling`, `tdd`, `codebase-design`, `domain-modeling`, `diagnosing-bugs`,
  `prototype`, `resolving-merge-conflicts`, `wizard`, `writing-for-agents`
- `wayfinder` — plans an effort too big for one session as a map of decision
  tickets on the issue tracker; bridges discovery-ideation and code architecture.
  User-invoked only (no auto-trigger).
- `code-review` was folded into `scoville-code-anti-ai-slop` (see above) rather
  than kept standalone — both fired on "review" requests at different altitudes
  (mechanism vs. discipline), so the mechanism now lives as a reference the
  guardrail skill loads for that outcome.
- `improve-codebase-architecture` — scans a codebase for deepening opportunities,
  presents an HTML report, grills through whichever one you pick. Fills the
  code-architecture gap `codebase-design`/`domain-modeling` only gave vocabulary
  for.
- `to-spec` — synthesizes the current conversation into a spec, publishes to the
  issue tracker. No interview; pure synthesis of what's already been discussed.
- `to-tickets` — breaks a plan/spec/conversation into tracer-bullet tickets with
  blocking edges, published to the tracker.
- `implement` — implements a piece of work from a spec or ticket set. Consumes
  `to-spec`/`to-tickets` output directly.
- `handoff` — compacts the current conversation into a handoff document for
  another agent to pick up. Connective tissue between phase-agents.

All five above are user-invoked only (`disable-model-invocation: true`).

Renaming/redefining any of the above to fit personal workflow is expected and fine —
this repo is meant to be edited, not just mirrored from upstream.

## SDLC phase mapping (in progress)

| Phase | Skills |
| --- | --- |
| Discovery & Ideation | `discovery-ideation`, `grilling`, `wayfinder` (for oversized efforts) |
| Research | `scoville-research` |
| Design | `silk-design`, `frontend-design` |
| Code architecture | `codebase-design`, `domain-modeling`, `improve-codebase-architecture`, `wayfinder`, `to-spec`, `to-tickets` |
| Implementation | `tdd`, `prototype`, `implement`, `scoville-code-anti-ai-slop` |
| QA | `scoville-code-anti-ai-slop` (review outcome), `diagnosing-bugs`, `scoville-ui-anti-ai-slop` |
| Deployment / shipping | `resolving-merge-conflicts`, `wizard` |
| Cross-cutting | `handoff` — hands a phase's context to the next agent |

Agents (one per phase) still to be defined in `agents/`.

## Composition notes

The design trio (`frontend-design`, `silk-design`, `scoville-ui-anti-ai-slop`) all
fire on "build/fix UI" but aren't redundant — they sit at different altitudes and
compose in order:

1. `frontend-design` decides the aesthetic direction (palette, type, layout, copy) —
   after drafting the token system it checkpoints with the user against
   [skillsui.app/skills](https://www.skillsui.app/skills) as a second opinion
2. `silk-design` executes it with concrete motion/craft recipes
3. `scoville-ui-anti-ai-slop` audits the result (hierarchy, accessibility,
   responsiveness, usability)

Kept as three skills rather than merged, since collapsing them would mix judgment,
implementation, and audit into one file.
