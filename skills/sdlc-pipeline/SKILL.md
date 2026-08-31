---
name: sdlc-pipeline
description: Internal orchestration engine for the sdlc-new-feature/sdlc-fix/sdlc-redesign/sdlc-harden entry-point skills. Requires kind, request, and slug inputs, which only those entry points supply — do not invoke this directly from a bare user message; invoke the matching sdlc-* entry point instead and let it hand off here.
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
"prototype before you decide" premise the Design phase exists for. Sequence it explicitly:

**Forward (`kind: feature`, or `harden` if it touches UI):**
1. `ui-ux-pro-max` gathers data — styles, palette/reasoning profiles, font pairings, UX
   guidelines — and from it proposes **2-3 genuinely distinct candidate directions** for the
   brief, not one. "Distinct" means a different aesthetic category each (e.g. warm-editorial vs.
   dark-luxury vs. neobrutalist), not three palette variations on the same idea.
2. `imagegen-frontend-web`/`imagegen-frontend-mobile` generates concept images for each
   candidate — scope this to the key screen(s), not a full multi-section page, so three
   directions stays cheap to produce and cheap to compare.
3. **Gate here**, before `frontend-design` touches any code: present the candidates through
   `AskUserQuestion` (per this repo's question-UI convention) and get the user's pick, or a
   steer toward a fourth direction, before anything else runs.
4. Only now does `frontend-design` run — building out the token system and real implementation
   for the *already-chosen* direction. Its own internal skillsui.app checkpoint still applies as
   a second opinion on the chosen direction, not as the first alignment moment.
5. `silk-design` executes craft/motion; `design-system` formalizes tokens and component specs.

**Reverse (`kind: redesign`):**
1. `redesign-skill`'s **Scan** and **Diagnose** steps only — audit the existing site and list
   what's generic/weak. Stop before its **Fix** step; don't apply anything yet.
2. `imagegen-frontend-web`/`imagegen-frontend-mobile` generates concept images for 2-3 distinct
   upgrade directions, informed by the diagnosis, scoped to the key screen(s) being redesigned.
3. **Gate here**: present the candidates through `AskUserQuestion`, get the user's pick.
4. `redesign-skill`'s **Fix** step now applies the chosen direction against the existing stack.
5. `silk-design` and `design-system` as above, if the redesign's scope warrants formalizing
   tokens rather than just landing the fix.

## 5. Security auto-escalation

Regardless of size, if the diff touches authentication, secrets/credential handling, session or
token logic, or a database schema/migration, invoke `security-review` during Review/QA even for
a `trivial`/`small` run that would otherwise skip a full QA pass. Note the escalation in the run
manifest as forced, not optional — don't let a later gate silently drop it.

## Completion

The pipeline is done once Ship's gate is approved (or the user chose "Skip remaining phases" at
some earlier gate). Close the run manifest with a final status line; don't leave a phase marked
in-progress with no next action stated.
