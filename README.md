# sdlc-skills

A personal library of Claude Code skills and agents that carries a project from a raw
idea to shipped code — discovery, research, design, architecture, TDD implementation,
review, and shipping — through one gated pipeline, instead of one long unstructured
chat.

## Why this exists

Building real apps inside Claude Code without any structure tends to fail in a few
specific, repeatable ways:

- **Design gets skipped or guessed.** Code gets written before anyone agrees on the
  direction, so the first "finished" version is also the first thing anyone reacted to.
- **No prototype before commitment.** A visual direction gets locked in by writing the
  actual app, not by showing a few concepts and picking one.
- **Skills collide.** Install enough community skills and several start firing on the
  same request ("review this," "make it look better"), each with its own opinion,
  competing rather than composing.
- **Autonomy outruns trust.** A long agentic run with no checkpoints either needs
  babysitting the whole way through, or gets trusted more than it's earned — there's no
  middle ground where you approve each phase and stay out of the ones in between.
- **Context by monologue.** Conversation history is the only record of what was decided
  and why, so it either has to be re-explained to the next agent or session, or the
  reasoning is just lost.

This repo is one answer to all five: skills sourced from vetted third-party libraries
(never installed blind — each one is read, adapted, and given exactly one job), composed
into a pipeline that produces a written artifact at every phase (a brief, a spec, a
token system, tickets, a review) and stops for your approval before moving to the next
one.

## How it was built

Every skill here owns exactly one **altitude** — data, judgment, execution, or audit —
so two skills never compete for the same trigger. When a candidate skill did the same
job as something already here, its mechanism was folded in as a reference file instead
of vendored as a second, competing skill (see [Composition notes](#composition-notes)).
When altitudes genuinely differed, skills were kept separate and the composition order
was written down explicitly, never left implicit.

The result is `sdlc-pipeline`: a shared orchestration engine, loosely modelled on
affaan-m/ECC's `orch-pipeline` design (a size classifier, a phase→skill delegation
table, state carried as files rather than hidden context) but gated at **every** phase
transition rather than just twice (after planning, before commit) — reduced supervision
gets earned per phase as it proves reliable, not assumed up front.

## Quick start

1. Clone this repo somewhere permanent (not a temp directory).
2. Symlink what you want into Claude Code's skills/agents directories:
   ```bash
   for skill in sdlc-skills/skills/*/; do
     name=$(basename "$skill")
     ln -s "$(pwd)/$skill" ~/.claude/skills/"$name"
   done
   for agent in sdlc-skills/agents/*.md; do
     name=$(basename "$agent")
     ln -s "$(pwd)/$agent" ~/.claude/agents/"$name"
   done
   ```
   (Swap `~/.claude` for `~/.claude-personal` or wherever `CLAUDE_CONFIG_DIR` points, if
   you keep separate personal/work configs — this repo is symlinked into both on the
   machine it was built on.)
3. In a Claude Code session, invoke a pipeline entry point by name — see below.

## Using the pipeline

Three entry points, one per kind of work. Type the skill name (or ask Claude to invoke
it) to start:

| You want to... | Invoke |
| --- | --- |
| Build something new | `sdlc-new-feature` |
| Fix a bug, sized enough to want a paper trail | `sdlc-fix` |
| Redesign an existing page/screen | `sdlc-redesign` |
| Harden an app toward best-practice architecture | `sdlc-harden` |

Each one just captures your request, gives it a short slug, and hands off to
`sdlc-pipeline`, which:

1. **Sizes the effort** — trivial, small, standard, or large — and tells you which
   phases it's about to run before running any of them.
2. **Runs each phase** by delegating to the skill that already owns it (discovery,
   research, design, planning/architecture, implementation, review, shipping — the full
   map is in [SDLC phase mapping](#sdlc-phase-mapping)).
3. **Stops after every phase** and shows you what it produced. You get three choices:
   **Approve** (move on), **Revise** (stay here, adjust), or **Skip remaining phases**
   (ship what exists now). Nothing advances without your say-so.
4. **Tracks the run** in `docs/pipeline/<slug>.md` in the project you're working in —
   what ran, what got approved, what artifact each phase produced and where it lives.
5. **Escalates security review automatically** the moment a diff touches auth, secrets,
   or a database schema, no matter how small the change was classified.

Large, fuzzy-scoped efforts don't go straight into the pipeline — they're charted first
with `wayfinder` into a map of decision tickets, and each resolved ticket re-enters the
pipeline on its own.

**A worked example:** you invoke `sdlc-new-feature` with "add a saved-searches feature
to the app." The pipeline classifies it `standard`, runs Discovery (a grilled brief),
gates. You approve. It runs Research, gates. You approve. It runs Design — pulling style
data, drafting a direction, generating concept images for you to react to before any
code exists — gates. You pick a direction. It runs Plan (a spec, then tickets), gates.
Implementation happens test-first. QA runs the anti-slop guardrails plus a live-browser
accessibility pass. Ship handles merge conflicts and any manual steps. You approved
seven times; you didn't do any of the work in between.

`sdlc-harden` follows the same gate-every-phase shape but a different phase set:
Discovery and Design are skipped (there's no idea to frame and, usually, no visual
direction to agree on), and Research is never skipped the way it can be for a small
feature — it's where the pipeline gathers the actual "industry best practices" (security
checklists, architecture/resilience patterns for your stack and domain) that the rest of
the run audits the codebase against and a mandatory `security-review` closes out.

### Using a skill directly instead

The pipeline is for effort worth a full gated trail. For anything lighter — a quick
debug, a one-off style tweak, a spec written from a conversation you already had —
call the underlying skill directly (`diagnosing-bugs`, `frontend-design`, `to-spec`,
...). The entry points are deliberately **not** auto-triggering, specifically so they
never compete with those skills for the same request — see
[Composition notes](#composition-notes).

## Skills — what's here and where it came from

Skills here are the source of truth; nothing in this section is installed verbatim from
upstream — everything vendored was read, adapted to compose with what's already here,
and is expected to keep changing. Where a skill's own upstream license is stricter than
"personal use, adapted" (none checked here beyond what's linked), re-verify before
reusing this repo outside personal use.

**Authored here:**
- `discovery-ideation` — frames a raw idea/problem into a grilled, written brief
- `sdlc-pipeline`, `sdlc-new-feature`, `sdlc-fix`, `sdlc-redesign`, `sdlc-harden` — the
  shared orchestration engine and its four entry points (see [Using the pipeline](#using-the-pipeline))

**Vendored from [benjaminstelzer/scoville-*](https://github.com/benjaminstelzer):**
- `scoville-research` — evidence-first research; extended with background-agent
  delegation + saved-markdown-file persistence for lighter (non-Deep) runs
- `scoville-code-anti-ai-slop` — goal-first guardrail for planning/changing/testing/
  reviewing code; absorbed Matt Pocock's `code-review` two-axis (Standards + Spec)
  diff-review mechanism as `references/review.md`, invoked for the review outcome
- `scoville-ui-anti-ai-slop` — framework-aware guardrail for UI implementation/audit

**Vendored from [bendrape1-byte/silk-design](https://github.com/bendrape1-byte/silk-design):**
- `silk-design` — motion/polish-by-default web UI building

**Vendored from [anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md):**
- `frontend-design` — aesthetic direction, typography, and non-templated visual design
  choices; heavily extended here (see the `taste-skill` entry below)

**Vendored from Matt Pocock's skills plugin:**
- `grilling`, `tdd`, `codebase-design`, `domain-modeling`, `diagnosing-bugs`,
  `prototype`, `resolving-merge-conflicts`, `wizard`, `writing-for-agents`
- `wayfinder` — plans an effort too big for one session as a map of decision
  tickets on the issue tracker; bridges discovery-ideation and code architecture
- `code-review` — folded into `scoville-code-anti-ai-slop` rather than kept standalone
  (see [Composition notes](#composition-notes))
- `improve-codebase-architecture` — scans a codebase for deepening opportunities,
  presents an HTML report, grills through whichever one you pick
- `to-spec` — synthesizes the current conversation into a spec, publishes to the issue
  tracker (no interview, pure synthesis of what's already been discussed)
- `to-tickets` — breaks a plan/spec/conversation into tracer-bullet tickets with
  blocking edges, published to the tracker
- `implement` — implements a piece of work from a spec or ticket set
- `handoff` — compacts the current conversation into a handoff document for another
  agent to pick up

**Vendored from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)**
(skipped its `design`/`brand`/`banner-design`/`slides` skills as redundant with or out
of scope of what's already here):
- `ui-ux-pro-max` — queryable design-intelligence database (styles, palette/reasoning
  profiles, font pairings, UX guidelines, GSAP presets, chart types, stacks) via a
  `scripts/search.py` CLI
- `design-system` — three-layer token architecture (primitive→semantic→component) +
  component specs
- `ui-styling` — shadcn/ui + Radix + Tailwind, accessible components, dark mode
- `design-review` agent — see [Agents](#agents)

**Vendored from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)**
(skipped `brutalist-skill`/`minimalist-skill`/`soft-skill` as redundant with
`ui-ux-pro-max`'s style catalog, `brandkit`/`stitch-skill` as out of scope,
`image-to-code-skill` as Codex-specific, `output-skill` as redundant with
`scoville-code-anti-ai-slop`). Its flagship skill covered nearly the same ground as
`frontend-design` at the *same* altitude, so rather than vendor a second competing
skill, its mechanisms were folded into `frontend-design` as reference files:
- `frontend-design/references/ai-tells.md` — forbidden AI-tell patterns
- `frontend-design/references/dials-and-layout.md` — the three design dials, hard
  layout rules, content density rules, dark-mode protocol
- `frontend-design/references/design-system-appendix.md` — real install commands and
  canonical docs for common design systems

**Standalone, nothing else here overlaps them:**
- `redesign-skill` — audits an existing site, identifies generic AI patterns, upgrades
  to premium quality without breaking functionality (from Leonxlnx/taste-skill)
- `imagegen-frontend-web` / `imagegen-frontend-mobile` — generate per-section/per-screen
  concept images *before* code is written (from Leonxlnx/taste-skill)

Renaming/redefining any of the above to fit your own workflow is expected and fine —
this repo is meant to be edited, not just mirrored from upstream.

## SDLC phase mapping

| Phase | Skills |
| --- | --- |
| Discovery & Ideation | `discovery-ideation`, `grilling`, `wayfinder` (for oversized efforts) |
| Research | `scoville-research`, `ui-ux-pro-max` (design-data lookups). For hardening, this is where current security/architecture best practices for the stack get gathered. |
| Design | `ui-ux-pro-max` (data) → `frontend-design` (direction) → `imagegen-frontend-web`/`imagegen-frontend-mobile` (pre-code visual prototypes) → `silk-design` (craft) → `design-system` (tokens/component specs); `redesign-skill` for existing sites |
| Code architecture | `codebase-design`, `domain-modeling`, `improve-codebase-architecture` (fed by Research's findings when hardening), `wayfinder`, `to-spec`, `to-tickets` |
| Implementation | `tdd`, `prototype`, `implement`, `ui-styling`, `scoville-code-anti-ai-slop` |
| QA | `scoville-code-anti-ai-slop` (review outcome), `diagnosing-bugs`, `scoville-ui-anti-ai-slop` (discipline) + `design-review` agent (live-browser mechanism); `security-review` (mandatory when hardening, auto-escalated otherwise on auth/secrets/DB diffs) |
| Deployment / shipping | `resolving-merge-conflicts`, `wizard` |
| Cross-cutting | `handoff` — hands a phase's context to the next agent |

## Agents

`agents/` holds full phase agents (still mostly TBD) plus any ready-made agent worth
keeping as-is:

- `design-review` — live-browser UI reviewer: screenshots each viewport tier, checks
  WCAG 2.1 AA, runs a 7-phase review, returns ranked findings (Blockers → Nitpicks).
  `scoville-ui-anti-ai-slop/references/validation.md` points to it as the mechanism for
  a full multi-viewport audit, so the two don't compete — the guardrail skill owns what
  counts as sufficient evidence, this agent owns driving the browser. Reference commands
  (`design-plan`, `design-review`) and its heuristic fallback script
  (`design-audit.mjs`, used only if browsing fails) live in `agents/design-review-refs/`.
  Drives the browser via `mcp__claude-in-chrome__*` — swap this for whatever browser
  automation MCP is actually installed in your environment if it differs.

## Composition notes

Every skill here is meant to be complementary, not competing — each owns one altitude
(data, judgment, execution, audit) so two skills never fight over the same trigger.
Where two are adjacent enough to be confused, the boundary is written down explicitly
rather than left implicit.

**Every question a skill here asks the user goes through the `AskUserQuestion` tool, never
plain narrated text.** That's the built-in question UI — a real picker, with a short chip
label and 2-4 concrete options (yours recommended, first), rather than a wall of prose the
user has to answer freehand. It applies even to a question that looks free-text at first
glance (a slug, a URL, an unclear interface): distill the real candidates you can see into
options — including "something else," worded as an actual option — and let the tool's
built-in Other cover the rest, instead of leaving it fully open-ended. `grilling` is the
shared mechanism most interviewing here runs through (`discovery-ideation`, `wayfinder`,
`improve-codebase-architecture`'s pick-a-candidate loop all delegate into it), so it only
needed fixing in one place; a handful of skills with their own standalone question (a seam
confirmation in `tdd`, a ticket-breakdown gate in `to-tickets`, a stack/URL/slug detection
fallback in a few others) were updated individually. New skills should default to this from
the start rather than needing a retrofit.

**The design chain** (`ui-ux-pro-max`, `frontend-design`, `silk-design`,
`design-system`, `scoville-ui-anti-ai-slop`, `design-review`) all fire on "build/fix UI"
but aren't redundant — they compose in order:

1. `ui-ux-pro-max` supplies research data: styles, palette/reasoning profiles, font
   pairings, UX guidelines, relevant stack conventions
2. `frontend-design` decides the aesthetic direction on top of that data (palette,
   type, layout, copy) — after drafting the token system it checkpoints with the user
   against [skillsui.app/skills](https://www.skillsui.app/skills) as a second opinion,
   sets three numeric dials, and self-critiques against the AI-tells list before shipping
3. `imagegen-frontend-web`/`imagegen-frontend-mobile` turn that direction into
   pre-code concept images the user can react to before anything is built
4. `silk-design` executes the agreed direction with concrete motion/craft recipes;
   `design-system` formalizes the result into three-layer tokens and component specs
5. `scoville-ui-anti-ai-slop` is the standing audit discipline (hierarchy,
   accessibility, responsiveness, usability); `design-review` is the live-browser
   mechanism it dispatches for a full multi-viewport WCAG pass

`redesign-skill` runs this same chain in reverse-gear for an existing site: audit
first, then apply the same direction/craft/audit steps without breaking functionality.

**Every skill in this repo is model-invoked — nothing sets `disable-model-invocation`.**
That's a deliberate, repo-wide policy, not just a fix for one broken chain: a skill
flagged `disable-model-invocation: true` can't be reached through the Skill tool by
*any* caller, including another skill, only typed directly by a human. This repo relies
on skills invoking skills throughout — `sdlc-pipeline` delegating into every phase,
`improve-codebase-architecture` calling `grilling` and `domain-modeling` mid-flow, and
so on — so a flagged skill anywhere in a delegation chain is a dead end the calling
skill can't route around, not a safety rail. (An earlier version of this repo left
`sdlc-pipeline`, `wayfinder`, and several others flagged, and every one of them broke
the pipeline the same way: an entry point invoked it, got refused, and had to ask the
user to run the command by hand instead.)

Distinct triggers still matter, though — a bare "debug this" should reach
`diagnosing-bugs`, not the multi-phase `sdlc-fix` pipeline; a bare "make this look
better" should reach `redesign-skill`, not `sdlc-redesign`; a bare "find refactor
opportunities" should reach `improve-codebase-architecture`, not the research-plus-
security-mandate `sdlc-harden`. That distinction now lives entirely in how each
description is worded (`sdlc-*`'s descriptions state explicitly that they're for when
the user wants the *whole* supervised, gated trail, not one phase of it) rather than in
whether the skill can be invoked at all. Sharpen a
description if you see it misfire, don't reach for the flag to patch it — the flag
solves a different problem (keeping a skill off the model's own initiative entirely)
and reintroduces the dead-end failure above wherever another skill needs to reach it.

Kept as separate skills rather than merged throughout — collapsing them would mix data,
judgment, implementation, and audit into one file, which is exactly what "kept
complementary" is meant to prevent.

The same pattern governs `code-review` (folded as a reference into
`scoville-code-anti-ai-slop` rather than left to compete on "review") and `handoff`
(the one skill every phase-agent shares, so none of them reinvent context transfer).
