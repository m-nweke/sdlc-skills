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
  reviewing code
- `scoville-ui-anti-ai-slop` — framework-aware guardrail for UI implementation/audit

Vendored from [bendrape1-byte/silk-design](https://github.com/bendrape1-byte/silk-design):
- `silk-design` — motion/polish-by-default web UI building (design branch)

Vendored from [anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md):
- `frontend-design` — aesthetic direction, typography, and non-templated visual
  design choices (design branch)

Vendored from Matt Pocock's skills plugin:
- `grilling`, `tdd`, `codebase-design`, `domain-modeling`, `code-review`,
  `diagnosing-bugs`, `prototype`, `resolving-merge-conflicts`, `wizard`,
  `writing-for-agents`, `wayfinder` — plans an effort too big for one session as a
  map of decision tickets on the issue tracker; bridges discovery-ideation and
  code architecture. User-invoked only (no auto-trigger).

Renaming/redefining any of the above to fit personal workflow is expected and fine —
this repo is meant to be edited, not just mirrored from upstream.

## SDLC phase mapping (in progress)

| Phase | Skills |
| --- | --- |
| Discovery & Ideation | `discovery-ideation`, `grilling`, `wayfinder` (for oversized efforts) |
| Research | `scoville-research` |
| Design | `silk-design`, `frontend-design` |
| Code architecture | `codebase-design`, `domain-modeling`, `wayfinder`, ... |
| Implementation | `tdd`, `prototype`, `scoville-code-anti-ai-slop` |
| QA | `code-review`, `diagnosing-bugs`, `scoville-ui-anti-ai-slop` |
| Deployment / shipping | `resolving-merge-conflicts`, `wizard` |

Agents (one per phase) still to be defined in `agents/`.
