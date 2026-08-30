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

Vendored from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(skipped its `design`/`brand`/`banner-design`/`slides` skills as redundant with or
out of scope of what's already here):
- `ui-ux-pro-max` — queryable design-intelligence database (styles, palette/reasoning
  profiles, font pairings, UX guidelines, GSAP presets, chart types, stacks) via a
  `scripts/search.py` CLI. Feeds `frontend-design` with data rather than opinion —
  see the `design-plan` command pattern in `agents/design-review-refs/commands/`.
- `design-system` — three-layer token architecture (primitive→semantic→component) +
  component specs; bridges Design → Code architecture more concretely than
  `codebase-design`/`domain-modeling` alone.
- `ui-styling` — shadcn/ui + Radix + Tailwind, accessible components, dark mode.
  Implementation-phase skill; gives accessible defaults up front instead of catching
  violations later in audit.

Also brought over a ready-made agent (see Agents below): `design-review`.

Vendored from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (skipped
`brutalist-skill`/`minimalist-skill`/`soft-skill` as redundant with `ui-ux-pro-max`'s
style catalog, `brandkit`/`stitch-skill` as out of scope, `image-to-code-skill` as
Codex-specific, and `output-skill` as redundant with `scoville-code-anti-ai-slop`'s
completeness rules). Its flagship `taste-skill/SKILL.md` covered nearly the same mission
as `frontend-design` — anti-slop, read-the-brief, no templated defaults — at the *same*
altitude, so rather than vendor it as a second skill competing for the same trigger, its
concrete mechanisms were folded into `frontend-design` as new reference files:
- `frontend-design/references/ai-tells.md` — forbidden AI-tell patterns (the em-dash ban,
  "Jane Doe" placeholder content, div-based fake screenshots, eyebrow overuse, and more)
- `frontend-design/references/dials-and-layout.md` — the three dials
  (`DESIGN_VARIANCE`/`MOTION_INTENSITY`/`VISUAL_DENSITY`), hard layout rules, content
  density rules, and the dark-mode protocol
- `frontend-design/references/design-system-appendix.md` — real install commands and
  canonical docs for Material/Fluent/Carbon/shadcn/GOV.UK/etc., so a design-system choice
  is grounded rather than guessed

Two genuinely new skills came over standalone, since they don't overlap anything already
here:
- `redesign-skill` — audits an existing site, identifies generic AI patterns, upgrades to
  premium quality without breaking functionality. Nothing else covers the
  audit-existing-site workflow.
- `imagegen-frontend-web` / `imagegen-frontend-mobile` — generate per-section/per-screen
  concept images *before* code is written, for the user to react to. Fills the "prototype
  before the design is agreed" need with visual concepts, complementing `prototype`
  (Matt Pocock, code-based prototyping).

Renaming/redefining any of the above to fit personal workflow is expected and fine —
this repo is meant to be edited, not just mirrored from upstream.

## SDLC phase mapping (in progress)

| Phase | Skills |
| --- | --- |
| Discovery & Ideation | `discovery-ideation`, `grilling`, `wayfinder` (for oversized efforts) |
| Research | `scoville-research`, `ui-ux-pro-max` (design-data lookups) |
| Design | `ui-ux-pro-max` (data) → `frontend-design` (direction) → `imagegen-frontend-web`/`imagegen-frontend-mobile` (pre-code visual prototypes) → `silk-design` (craft) → `design-system` (tokens/component specs); `redesign-skill` for existing sites |
| Code architecture | `codebase-design`, `domain-modeling`, `improve-codebase-architecture`, `wayfinder`, `to-spec`, `to-tickets` |
| Implementation | `tdd`, `prototype`, `implement`, `ui-styling`, `scoville-code-anti-ai-slop` |
| QA | `scoville-code-anti-ai-slop` (review outcome), `diagnosing-bugs`, `scoville-ui-anti-ai-slop` (discipline) + `design-review` agent (live-browser mechanism) |
| Deployment / shipping | `resolving-merge-conflicts`, `wizard` |
| Cross-cutting | `handoff` — hands a phase's context to the next agent |

## Agents

`agents/` holds full phase agents (still mostly TBD) plus any ready-made agent worth
keeping as-is:

- `design-review` — live-browser (Playwright MCP) UI reviewer: screenshots each
  viewport tier, checks WCAG 2.1 AA, runs a 7-phase review, returns ranked findings
  (Blockers → Nitpicks). `scoville-ui-anti-ai-slop/references/validation.md` now
  points to it as the mechanism for a full multi-viewport audit, so the two don't
  compete — the guardrail skill still owns what counts as sufficient evidence, this
  agent owns driving the browser. Reference commands (`design-plan`, `design-review`)
  and its heuristic fallback script (`design-audit.mjs`, used when no MCP browser is
  available) live in `agents/design-review-refs/`.
  **Caveat:** needs `mcp__playwright` or `mcp__chrome-devtools` installed to drive a
  real browser — neither is currently configured in this environment (which uses
  `claude-in-chrome` instead per this machine's CLAUDE.md). Until one of those MCP
  servers is added, it falls back to the heuristic-only script.

## Composition notes

Every skill here is meant to be complementary, not competing — each owns one altitude
(data, judgment, execution, audit) so two skills never fight over the same trigger.
Where two are adjacent enough to be confused, the boundary is written down explicitly
rather than left implicit:

The design pipeline (`ui-ux-pro-max`, `frontend-design`, `silk-design`,
`design-system`, `scoville-ui-anti-ai-slop`, `design-review`) all fire on "build/fix
UI" but aren't redundant — they compose in order:

1. `ui-ux-pro-max` supplies research data: styles, palette/reasoning profiles, font
   pairings, UX guidelines, relevant stack conventions
2. `frontend-design` decides the aesthetic direction on top of that data (palette,
   type, layout, copy) — after drafting the token system it checkpoints with the user
   against [skillsui.app/skills](https://www.skillsui.app/skills) as a second opinion,
   sets the three dials, and self-critiques against the AI-tells list before shipping
3. `imagegen-frontend-web`/`imagegen-frontend-mobile` turn that direction into
   pre-code concept images the user can react to before anything is built
4. `silk-design` executes the agreed direction with concrete motion/craft recipes;
   `design-system` formalizes the result into three-layer tokens and component specs
5. `scoville-ui-anti-ai-slop` is the standing audit discipline (hierarchy,
   accessibility, responsiveness, usability); `design-review` is the live-browser
   mechanism it dispatches for a full multi-viewport WCAG pass

`redesign-skill` runs this same pipeline in reverse-gear for an existing site: audit
first, then apply the same direction/craft/audit steps without breaking functionality.

Kept as separate skills rather than merged — collapsing them would mix data,
judgment, implementation, and audit into one file, which is exactly what "kept
complementary" is meant to prevent.

The same pattern governs `code-review` (folded as a reference into
`scoville-code-anti-ai-slop` rather than left to compete on "review") and `handoff`
(the one skill every phase-agent shares, so none of them reinvent context transfer).
