# Epic feature-branch workflow

Source: adapted from Quext's `/epic` and `/ticket` skills (`quext-skills/epic`,
`quext-skills/ticket`), which set up and work a long-lived feature branch for a real
issue-tracker epic.

`to-tickets` decides *what* the tickets are and their blocking edges. This reference is
for the git structure that executes them, once they're published to a real tracker as
children of one epic — it's the bridge into `work-ticket`, which does the actual
implementation loop per ticket.

## When this applies

- The published tickets are children of one real epic issue (not a local-file ticket
  set — this needs a tracker to hang the parent/child and branch-naming off of).
- There are enough of them, and enough sequencing between them, that landing each
  straight to `main` would be noisy or unsafe mid-epic (partial features visible,
  migrations half-applied). A two- or three-ticket epic with no real dependencies
  doesn't need this — let each ticket PR straight to `main` and skip the feature branch.

If unsure, ask the user rather than defaulting either way — creating a feature branch
for one ticket, or skipping one for a genuinely long epic, are both minor but annoying
to undo.

## Setup, once, after tickets are published

1. **Order the frontier**, not just the blocking edges already on each ticket: read
   each child's description for explicit depends-on notes and shared-code overlap.
   Validations and shared prerequisites first, dependents after, independent tickets
   anywhere. Present the order as a table (ticket, summary, depends-on) before creating
   anything.
2. **Create the feature branch** from latest `main`, named `<EPIC-KEY>-<slug>-epic`
   (match the repo's existing branch-naming convention):
   ```bash
   git fetch origin && git checkout -b <EPIC-KEY>-<slug>-epic origin/main
   git push -u origin <EPIC-KEY>-<slug>-epic
   ```
3. **Save the plan to memory** (a `project` memory file + `MEMORY.md` index line):
   feature branch name, ticket order with one-line rationale, per-ticket watch-outs
   (migrations, new authorities/permissions, shared files touched by more than one
   ticket), and any repo-`CLAUDE.md` gotchas that apply across the whole epic
   (timestamp-ordered migrations, a periodic rebase-on-main cadence for the feature
   branch). `work-ticket` reads this back to pick the base branch and the next ticket —
   without it, each ticket run has no way to know a feature branch exists.
4. Check `assignee` on the created children (they usually inherit the parent epic's
   assignee — confirm that's intended) and that nothing landed pre-scheduled into a
   sprint by accident.

## While working tickets (delegates to `work-ticket`)

- Every ticket branch cuts off the **feature branch**, not `main`, and PRs back into
  the **feature branch**, not `main` — this is the one place `work-ticket`'s own
  "off the epic's consolidation branch if one exists, else `develop`" line (its Step 3)
  resolves against: the consolidation branch *is* this feature branch, found via the
  memory plan from Setup step 3.
- After a ticket's PR merges into the feature branch, **continue automatically** to the
  next ticket whose blockers are all done (the frontier) — this cycle has standing
  approval once the epic is underway. Stop only when: the plan is exhausted, the user
  interrupts, or a ticket hits something needing a human call (failing CI that isn't a
  quick fix, an ambiguous spec, a scope question).
- Update the memory plan after each merge: which ticket landed, its PR number/date, and
  anything learned that changes a later ticket's plan.

## Epic finale — when the last ticket merges

Never auto-merge this PR; hand off to the user, same as any other merge into `main`.

1. Re-check any timestamp-ordered migrations against what landed on `main` while the
   epic was in flight — a migration merged to `main` with a later timestamp than one on
   the feature branch needs the feature branch's renumbered to sort after it.
2. Rebase the feature branch on latest `main`; re-run the full test suite (not the
   scoped subset a single ticket's `work-ticket` run would use).
3. Open the epic-branch → `main` PR summarizing every ticket it carries (list each PR).
   Run the same review loop as any ticket PR before asking for the merge.
