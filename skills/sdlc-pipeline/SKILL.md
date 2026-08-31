---
name: sdlc-pipeline
description: Internal orchestration engine for the sdlc-new-feature/sdlc-fix/sdlc-redesign entry-point skills. Requires kind, request, and slug inputs, which only those entry points supply — do not invoke this directly from a bare user message; invoke the matching sdlc-* entry point instead and let it hand off here.
---

# SDLC Pipeline

The shared engine every `sdlc-*` entry point delegates into. It never does phase work itself —
it classifies size, decides which phases apply, and hands each one to the skill that already
owns it (see the phase table below and this repo's `README.md` for the full composition
rationale). Its own job is the parts nothing else owns: sizing the effort, sequencing the
phases, gating between them, and tracking the run.

**Every phase transition gates on explicit user approval — no exceptions by default.** That's a
deliberate departure from lighter shared-pipeline designs that gate only after planning and
before commit: reduced supervision gets earned per-phase as it proves reliable, not assumed
up front.

## Inputs

The caller (an `sdlc-*` entry-point skill) provides:
- **kind** — `feature` | `fix` | `redesign`
- **request** — the raw ask, in the user's own words
- **slug** — short kebab-case name for the effort

If invoked directly with any of these missing, ask before doing anything else — don't guess a
slug for something that will be referenced across several artifacts.

## 1. Classify size

| Size | Signal | Phases that run |
| --- | --- | --- |
| **trivial** | Typo, copy tweak, single-line config/version bump — no design or architecture surface | Implement → Review → Ship, one gate before Ship |
| **small** | Bug fix or small feature inside existing architecture — no new design surface, no real architecture decision | Plan (`to-spec` only) → Implement → Review → Ship |
| **standard** | New feature or meaningful change with a real design and/or architecture surface | Discovery → Research → Design (if UI-facing) → Plan → Implement → Review → Ship |
| **large** | Ambiguous scope, spans more than one agent session, several undecided branches | Chart first — go to step 2, don't run the pipeline yet |

State the size and which phases you'll run before starting step 3, so the user can correct a
misclassification before any phase work happens.

## 2. Large efforts: chart before you pipeline

Don't run this pipeline against an effort too big to see the shape of. Invoke the Skill tool
with `wayfinder` instead, using the request as the destination to chart. Each resulting decision
ticket, once resolved, re-enters this pipeline on its own as a `standard` (or smaller) run —
that's a fresh invocation with its own slug, not a loop inside this one.

## 3. Track the run

Create (or append to, if `docs/pipeline/<slug>.md` already exists) a run manifest:

```markdown
# Pipeline: <slug>

**Kind:** <feature|fix|redesign>  **Size:** <trivial|small|standard|large>
**Request:** <raw ask>

| Phase | Status | Artifact | Gate decision |
| --- | --- | --- | --- |
| Discovery | done | docs/discovery/<slug>.md | Approved |
| ... | | | |
```

This file is the pipeline's own state — the phase artifacts it links to (briefs, specs,
tickets, design tokens) already have their own home per the skill that produces them; don't
duplicate their content here, only track that they exist and what was decided about them.

## 4. Walk the phases, gate at every transition

For each phase your size classification includes, in order:

1. Invoke the delegate skill(s) listed for that phase in the table below, in the order given.
2. Record the artifact path or tracker link it produced in the run manifest.
3. Present a short summary of what the phase produced — not the full artifact, the artifact
   *is* the detail — and gate with `AskUserQuestion`: **Approve** (advance), **Revise** (stay in
   this phase, adjust, re-gate), or **Skip remaining phases** (jump straight to Ship with what
   exists so far). Do not advance without an explicit Approve.
4. Update the run manifest's gate decision before moving on.

### Phase table

| Phase | Delegates to |
| --- | --- |
| Discovery | `discovery-ideation` |
| Research | `scoville-research`; `ui-ux-pro-max` for design-data lookups |
| Design (if UI-facing) | `ui-ux-pro-max` → `frontend-design` → `imagegen-frontend-web`/`imagegen-frontend-mobile` → `silk-design` → `design-system`. For `kind: redesign`, use `redesign-skill` instead, which runs this same pipeline in reverse against the existing site. |
| Plan / Architecture | `to-spec`, `codebase-design`, `domain-modeling`, `improve-codebase-architecture` (only if it surfaces real friction), `to-tickets` (standard/large sizes only) |
| Implement (TDD) | `tdd`, `implement`, plus `ui-styling`/`silk-design`/`frontend-design` if the work touches UI. For `kind: fix`, start with `diagnosing-bugs` before implementing. |
| Review / QA | `scoville-code-anti-ai-slop` (review outcome); `scoville-ui-anti-ai-slop` + the `design-review` agent if UI was touched; `security-review` if step 5 below applies |
| Ship | `resolving-merge-conflicts` (if conflicts exist), `wizard` (if manual infra steps remain), `handoff` (if the session ends before Ship completes) |

## 5. Security auto-escalation

Regardless of size, if the diff touches authentication, secrets/credential handling, session or
token logic, or a database schema/migration, invoke `security-review` during Review/QA even for
a `trivial`/`small` run that would otherwise skip a full QA pass. Note the escalation in the run
manifest as forced, not optional — don't let a later gate silently drop it.

## Completion

The pipeline is done once Ship's gate is approved (or the user chose "Skip remaining phases" at
some earlier gate). Close the run manifest with a final status line; don't leave a phase marked
in-progress with no next action stated.
