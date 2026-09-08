---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker). Use when the user asks to break work into tickets, create issues, or turn a plan/spec into trackable pieces.
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.

The issue tracker and triage label vocabulary should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.

### 4. Identify parallel candidates

For each main ticket (sized for a full agent session, e.g. Sonnet), look for a **parallel candidate**: a smaller, cheaper companion ticket that can be worked at the same time by a second, lighter-weight agent (e.g. Haiku).

<parallel-candidate-rules>

- **File-disjoint is the hard requirement.** The candidate must touch files the main ticket never touches. If you can't prove disjointness, don't propose the candidate — fold the work back into the main ticket instead. When the repo has `graphify-out/`, use `graphify explain` on the shared symbols/files to check for hidden overlap before proposing a pair; otherwise reason from the file list directly.
- **No blocking edge between a ticket and its own candidates.** They run alongside their pair, not before or after it. A candidate may still have blocking edges to *other* tickets if genuinely needed.
- Look for real, separable, smaller-scoped work near the same slice: fixtures/test data, a config or schema stub, an isolated util/type/constants file, docs, a script, a lint/type cleanup elsewhere in the codebase — the kind of self-contained task a lighter model can do correctly without deep context, while the main ticket carries the core vertical slice.
- **Not every ticket gets one.** Propose a candidate only when a genuine, file-disjoint, smaller task exists. Don't invent filler work just to populate the section — an empty "Parallel candidates" section is a correct, common outcome.
- For each candidate, name: what it delivers, the files/areas it touches (so disjointness is checkable at a glance), and the suggested agent size.

</parallel-candidate-rules>

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work
- **Parallel candidates** (if any): each candidate's title, what it delivers, the files it touches, and suggested agent size

Gate the breakdown with the `AskUserQuestion` tool rather than a plain-text ask — options like
**Approve**, **Granularity's off** (too coarse or too fine), **Blocking edges are wrong** (a
ticket depends on something that doesn't actually gate it), with your own read as the
recommended option. Iterate until the user approves.

Then, separately, let the user choose which parallel candidates to actually publish: list every proposed candidate and ask the user to pick which to add (all, some, or none) and whether any should be reprioritized ahead of others in the same wave. Only publish the candidates the user selects — an unselected candidate's work simply stays folded into its main ticket and is not published separately.

### 6. Publish the tickets to the configured tracker

Publish the approved tickets. **How** depends on the tracker `/setup-matt-pocock-skills` configured; the tickets are the same either way, only the shape of the blocking edges changes:

- **Local files** → write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order (blockers first). Each file's "Blocked by" lists the numbers/titles it depends on. Use the per-ticket file template below: one ticket per file, never a single combined file.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per ticket in dependency order (blockers first) so each ticket's blocking edges can reference real identifiers. Use the platform's native blocking / sub-issue relationship where it has one; otherwise set each ticket's "Blocked by" to the blocking issues. Apply the `ready-for-agent` triage label unless instructed otherwise; the tickets are agent-grabbable by construction.
  - **Jira specifically** → follow the `jira-writing` skill for the write mechanics (ADF round-trip, field/hierarchy rules). This skill owns the ticket content and structure; `jira-writing` owns getting that content into Jira intact.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

Publish each selected parallel candidate as its own ticket, using the same template as any other ticket, with no blocking edge to the main ticket it pairs with (see step 4). Its "What to build" should reference the main ticket by title for context, but the two are meant to be picked up and worked at the same time by two different agents.

Do NOT close or modify any parent issue.

**On a real tracker, if these tickets are children of one epic** and there are enough of
them with enough sequencing that landing straight to `main` per-ticket would be unsafe
mid-epic — set up the feature-branch execution structure in
`references/epic-git-workflow.md` before handing off to `work-ticket`. A small epic with
no real dependencies can skip it and let each ticket PR straight to `main`.

<local-ticket-template>

# <NN>: <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective, not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None (can start immediately)".

**Parallel candidates:** the number/title of any file-disjoint companion ticket that can be worked at the same time as this one, and its suggested agent size, or "None".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)".

## Parallel candidates

- A reference to each file-disjoint companion ticket that can be worked at the same time as this one, its suggested agent size, and the files/areas it touches, or "None".

</issue-template>

In either form, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

The **Parallel candidates** field is a second exception to the no-file-paths rule: naming the files/areas each side of a pair touches is what makes the disjointness claim checkable, so it's worth the staleness risk there specifically. Keep it to areas/files, not line-level detail.
