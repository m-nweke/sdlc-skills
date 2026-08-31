---
name: sdlc-pipeline
description: Internal orchestration engine for the sdlc-new-feature/sdlc-fix/sdlc-redesign/sdlc-harden entry-point skills. Requires kind, request, and slug inputs, which only those entry points supply — do not invoke this directly from a bare user message; invoke the matching sdlc-* entry point instead and let it hand off here.
---

# SDLC Pipeline

The shared engine every `sdlc-*` entry point delegates into. **You are the orchestrator, not the
worker** — you never do phase work in your own context. You classify size, decide which phases
apply, and for each one **spawn a fresh subagent through the Agent tool** to do the actual work
(invoke the delegate skill(s), produce the phase's artifact, report back). Your own job is only
the parts nothing else owns: sizing the effort, sequencing the phases, spawning and gating
between them, and tracking the run. See the phase table below and this repo's `README.md` for
the full composition rationale of what each phase delegates to.

**Every phase transition gates on explicit user approval — no exceptions by default.** That's a
deliberate departure from lighter shared-pipeline designs that gate only after planning and
before commit: reduced supervision gets earned per-phase as it proves reliable, not assumed
up front.

**Every phase runs in its own spawned agent, never inline in yours.** One agent (you) starts the
run and creates the agents needed to complete it, one phase at a time — it never does the phase
work itself by loading a skill's instructions directly into its own context. This keeps your own
context to just spawn prompts, short summaries, and gate decisions, so it stays small enough to
orchestrate a long run without itself becoming the bottleneck. See **Context budget** below for
how this composes with phases that are themselves too big for one agent.

## Inputs

The caller (an `sdlc-*` entry-point skill) provides:
- **kind** — `feature` | `fix` | `redesign` | `harden`
- **request** — the raw ask, in the user's own words
- **slug** — short kebab-case name for the effort

If invoked directly with any of these missing, use the `AskUserQuestion` tool before doing
anything else, not a plain-text ask — `kind` has four concrete options to offer outright; for
`slug`, offer 2-3 candidates derived from `request`. Don't guess a slug for something that will
be referenced across several artifacts.

## 1. Classify size

For `kind: feature` | `fix` | `redesign`:

| Size | Signal | Phases that run |
| --- | --- | --- |
| **trivial** | Typo, copy tweak, single-line config/version bump — no design or architecture surface | Implement → Review → Ship, one gate before Ship |
| **small** | Bug fix or small feature inside existing architecture — no new design surface, no real architecture decision | Plan (`to-spec` only) → Implement → Review → Ship |
| **standard** | New feature or meaningful change with a real design and/or architecture surface | Discovery → Research → Design (if UI-facing) → Plan → Implement → Review → Ship |
| **large** | Ambiguous scope, spans more than one agent session, several undecided branches | Chart first — go to step 2, don't run the pipeline yet |

`kind: harden` has a different shape, not just a different depth — it's an
audit-and-upgrade of what already exists against externally researched practices, not a
new idea being framed, so **Discovery and Design are skipped at every size** (unless the
hardening work itself touches UI, e.g. an auth flow's UX — treat that as a `redesign`
consideration inside the Design phase, not a reason to skip it here):

| Size | Signal | Phases that run |
| --- | --- | --- |
| **trivial** | One specific known fix — a flagged dependency, a single misconfiguration | Implement → Review (`security-review` always) → Ship |
| **small** | Hardening one module/service against an already-known checklist, no new research needed | Plan (`to-spec` only) → Implement → Review → Ship |
| **standard** | Hardening a bounded area of the app against researched best practices | Research → Plan → Implement → Review → Ship |
| **large** | Hardening the whole application across many services/domains | Chart first — go to step 2, don't run the pipeline yet |

For `harden`, Research and `security-review` are never skipped at `standard` or larger —
research is the step that supplies the "industry best practices" the rest of the run
audits against, and a hardening pass without a security review isn't one.

State the size and which phases you'll run before starting step 3, so the user can correct a
misclassification before any phase work happens.

## 2. Large efforts: chart before you pipeline

Don't run this pipeline against an effort too big to see the shape of. Spawn an agent to invoke
`wayfinder` instead, using the request as the destination to chart — charting is itself real
interviewing and mapping work, not orchestration bookkeeping, so it follows the same spawn rule
as any phase. Each resulting decision ticket, once resolved, re-enters this pipeline on its own
as a `standard` (or smaller) run — that's a fresh invocation with its own slug, not a loop
inside this one.

## 3. Track the run

Create (or append to, if `docs/pipeline/<slug>.md` already exists) a run manifest:

```markdown
# Pipeline: <slug>

**Kind:** <feature|fix|redesign>  **Size:** <trivial|small|standard|large>
**Request:** <raw ask>

| Phase | Agent(s) spawned | Status | Artifact | Gate decision |
| --- | --- | --- | --- | --- |
| Discovery | 1 | done | docs/discovery/<slug>.md | Approved |
| ... | | | | |
```

This file is the pipeline's own state — the phase artifacts it links to (briefs, specs,
tickets, design tokens) already have their own home per the skill that produces them; don't
duplicate their content here, only track that they exist, which agent(s) produced them, and
what was decided about them. The **Agent(s) spawned** count matters: it's how a later read of
this file shows whether a phase stayed appropriately scoped or had to be split further.

## 4. Walk the phases: spawn, gate, repeat

For each phase your size classification includes, in order:

1. **Write a self-contained prompt** for the phase — the spawned agent starts with zero context,
   so include: `kind`/`slug`/`request`, which delegate skill(s) to invoke (from the table below),
   the exact artifact to produce and where to save it, and *pointers* (file paths, not pasted
   content) to any prior phase artifacts it needs to read. Never paste a prior artifact's full
   content into the prompt — that's exactly the accumulation this design avoids.
2. **Spawn it with the Agent tool** — omit `subagent_type` (general-purpose) unless a named agent
   already fits (e.g. `design-review` for a live-browser QA pass). Never use `subagent_type:
   "fork"` for phase work — a fork inherits your full conversation context, which defeats the
   entire point of a fresh, scoped agent.
3. Record the artifact path or tracker link the agent reports back, and how many agents it took
   (1, unless the phase decomposed further — see **Context budget**), in the run manifest.
4. Present a short summary of what the phase produced — not the full artifact, the artifact
   *is* the detail — and gate with `AskUserQuestion`: **Approve** (spawn the next phase's agent),
   **Revise** (spawn a fresh agent to adjust this phase's artifact, re-gate), or **Skip remaining
   phases** (jump straight to Ship with what exists so far). Do not spawn the next phase's agent
   without an explicit Approve — the artifact must be raised and reviewed by the user before it
   hands off.
5. Update the run manifest's gate decision before moving on.

## Context budget: spawn, don't accumulate

**No agent's task — yours or a phase agent's — should need more than roughly 40% of its context
window.** That's the reason phase work is spawned rather than run inline: an orchestrator that
absorbed every phase's full working context (codebase exploration, draft iterations, tool output)
would blow well past that by Ship. Two levers keep it there:

- **You never absorb phase content.** Your context holds spawn prompts, the short summary each
  agent reports back, and gate decisions — never a phase's actual working content. That's what
  keeps *your* context small across an entire multi-phase run.
- **A phase agent that's still too big decomposes further.** If a phase's own scope looks too
  large for one agent before you spawn it — many tickets in Implement, a sprawling Review, a
  large-surface codebase exploration in Plan — spawn it as a small coordinating agent whose job
  is itself to spawn one sub-agent per ticket/seam/file-group, collect their reports, and return
  *one* consolidated artifact and summary to you. You still only see one report either way; the
  decomposition happens a level down. There's no tool to measure a running agent's context usage
  directly, so judge this from scope up front (file count, ticket count, breadth of concern) —
  a task that's "one focused thing" fits in an agent; a task that's "several of those" doesn't.

### Phase table

| Phase | Delegates to |
| --- | --- |
| Discovery | `discovery-ideation`. Skipped entirely for `kind: harden` — there's no idea to frame, the ask is already well-formed. |
| Research | `scoville-research`; `ui-ux-pro-max` for design-data lookups. For `kind: harden`, this is where the "industry best practices" get gathered: security hardening checklists (OWASP ASVS/Top 10, CIS benchmarks), and architecture/resilience patterns for the project's actual stack and domain — not generic advice. |
| Design (if UI-facing) | See **The Design phase: prototypes before direction** below — never skip straight to `frontend-design`/`redesign-skill` building real code. Skipped entirely for `kind: harden` unless the hardening work itself touches UI (e.g. an auth flow's UX). |
| Plan / Architecture | `to-spec`, `codebase-design`, `domain-modeling`, `improve-codebase-architecture` (only if it surfaces real friction), `to-tickets` (standard/large sizes only). For `kind: harden`, run `improve-codebase-architecture` first — feed it the Research phase's findings so the deepening opportunities it surfaces are audited against the researched practices, not just general "shallow module" heuristics — then `to-spec` the target architecture before `to-tickets`. |
| Implement (TDD) | `tdd`, `implement`, plus `ui-styling`/`silk-design`/`frontend-design` if the work touches UI. For `kind: fix`, start with `diagnosing-bugs` before implementing. |
| Review / QA | `scoville-code-anti-ai-slop` (review outcome); `scoville-ui-anti-ai-slop` + the `design-review` agent if UI was touched; `security-review` if step 5 below applies. For `kind: harden`, `security-review` is mandatory at every size, not conditional on step 5's diff heuristic. |
| Ship | `resolving-merge-conflicts` (if conflicts exist), `wizard` (if manual infra steps remain), `handoff` (if the session ends before Ship completes) |

### The Design phase: prototypes before direction

**No design phase writes real code, or commits to a direction, before the user has seen and
aligned on candidate concepts.** `frontend-design` and `redesign-skill` are both capable of
deciding a direction and building it in the same pass if you invoke them directly — that's fine
for a standalone ad-hoc request, but inside this pipeline it would silently defeat the whole
"prototype before you decide" premise the Design phase exists for. Sequence it explicitly, and
pick the prototype format by what's being designed:

**Prototype format — coded HTML is the default, `imagegen` is the exception.** For app/product
screens (dashboards, forms, data views, anything with real entities and state), build a
self-contained HTML/CSS prototype directly — hand-coded, no image-gen model call — rather than
reaching for `imagegen-frontend-web`/`imagegen-frontend-mobile`. It's cheaper (one artifact, zero
image-gen calls), and it's the format that actually lets the user read real content instead of
looking at a picture of it. Reserve `imagegen-frontend-web`/`imagegen-frontend-mobile` for
marketing pages, landing pages, and other primarily-visual/narrative surfaces — its documented
specialty, and the one case a static concept image genuinely beats a coded mock.

**Ground every candidate in the real screens.** Before drafting anything, read the current app's
actual code (or a live screenshot) for the screen(s) in scope, and pull its real information
architecture and entity shapes — for a redesign this is `redesign-skill`'s Scan/Diagnose step;
for a new feature, read the surrounding screens it'll sit beside. Populate every candidate with
**realistic mock data matching that real shape** (real field names, real entity types, believable
sample values), not an abstracted generic pattern invented from the brief alone — a mockup of
*this* app's actual accounts/paychecks/goals screen, not "a dashboard." Grounding is about
content and structure, not palette.

**Ask whether tokens are in play, don't assume.** Before generating candidates, ask through
`AskUserQuestion`: reuse the app's current design tokens (candidates vary layout/composition
only), or explore fresh token systems too (candidates can each use a different palette/type
system)? Both are legitimate depending on whether this is a targeted screen redesign or a
broader visual-identity change — don't default to either silently. (`redesign-skill`'s later Fix
step is where "improve without breaking functionality" constrains things again, once a direction
is picked, regardless of which way this was answered.)

This naturally splits into two spawned agents with a gate between them — the concrete example of
**Context budget** above: the prototype work (research + N candidate mockups) and the real build
are different-enough-sized tasks that bundling them into one agent risks exactly the overrun this
whole design exists to avoid.

**Forward (`kind: feature`, or `harden` if it touches UI):**
1. **Spawn Agent 1 — prototype.** Prompt it to run `ui-ux-pro-max` for data (styles,
   palette/reasoning profiles, font pairings) and propose **3 genuinely distinct candidate
   directions** for the brief ("distinct" means a different aesthetic category each — e.g.
   warm-editorial vs. dark-luxury vs. neobrutalist — not palette variations on one idea), then
   build one self-contained HTML artifact with a tab/switcher between them (see "Prototype
   format" above), each populated with realistic mock data for the real screen(s) in scope,
   tokens varying or fixed per the answer to the question above. It reports back the artifact
   path and a one-line description of each candidate.
2. **Gate here**, before any real code exists: present the artifact and get the user's pick
   through `AskUserQuestion` (per this repo's question-UI convention), or a steer toward a
   different direction, before spawning the next agent.
3. **Spawn Agent 2 — build.** Prompt it with the chosen candidate's description and the
   prototype artifact's path, to run `frontend-design` and build the token system and real
   implementation for that *already-chosen* direction (its own internal skillsui.app checkpoint
   still applies as a second opinion, not the first alignment moment), then `silk-design` for
   craft/motion and `design-system` to formalize tokens and component specs.

**Reverse (`kind: redesign`):**
1. **Spawn Agent 1 — audit + prototype.** Prompt it to run `redesign-skill`'s **Scan** and
   **Diagnose** steps only (audit the existing site's real screens and content, list what's
   generic/weak — stop before **Fix**, don't apply anything), then build one self-contained HTML
   artifact with a tab/switcher between 3 distinct upgrade directions (per "Prototype format,"
   "Ground every candidate," and the tokens question above), informed by its own diagnosis. It
   reports back the artifact path, the diagnosis summary, and a one-line description of each
   candidate.
2. **Gate here**: present the artifact, get the user's pick through `AskUserQuestion`.
3. **Spawn Agent 2 — fix.** Prompt it with the chosen candidate's description, the diagnosis
   summary, and the prototype artifact's path, to run `redesign-skill`'s **Fix** step against the
   existing stack, then `silk-design`/`design-system` if the redesign's scope warrants
   formalizing tokens rather than just landing the fix.

## 5. Security auto-escalation

Regardless of size, if the diff touches authentication, secrets/credential handling, session or
token logic, or a database schema/migration, invoke `security-review` during Review/QA even for
a `trivial`/`small` run that would otherwise skip a full QA pass. Note the escalation in the run
manifest as forced, not optional — don't let a later gate silently drop it.

## Completion

The pipeline is done once Ship's gate is approved (or the user chose "Skip remaining phases" at
some earlier gate). Close the run manifest with a final status line; don't leave a phase marked
in-progress with no next action stated.
