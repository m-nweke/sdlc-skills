---
name: work-ticket
description: Take a Jira ticket from paste to reviewed PR — read the ticket, prove the root cause, plan, implement the minimal change, verify, self-review the diff, open the PR, request Copilot, work the review loop, and update the ticket. Use when handed a ticket key, a Jira URL, or a pasted ticket body and asked to implement it.
---

# Work a ticket

Ticket → evidence → plan → minimal change → verified → self-reviewed → PR → Copilot loop → ticket updated.

`$ARGUMENTS` is a ticket key (`IOTH-6543`), a Jira URL, or a pasted ticket body.

## Three rules that outrank the rest

**Evidence before code.** Never write a line off the first plausible explanation. Find the root cause, show it at `file.js:line`, and say what confirms it. Wrong-but-confident diagnoses are the most expensive failure mode here — two dead theories on one bug before the real cause. If you have a hypothesis and not proof, say which it is.

**Smallest change that fixes the root cause.** No speculative refactors, no extra abstractions, no per-case UI variants, no client-side workaround for something the backend should fix. If a workaround already exists and the real fix lands, remove the workaround — don't leave dead scaffolding. Assume the right answer is smaller than your first draft. Before writing anything custom, run `scoville-code-anti-ai-slop`'s priority ladder: skip it if the ticket doesn't need it, reuse an existing in-repo pattern, use a built-in language/framework feature, only then write the minimal custom code.

**Narrate trade-offs as you go.** Any real fork — where state lives, reuse vs. write new, FE-handles-null vs. BE-fixes-it, scope you're deliberately dropping — gets two or three sentences inline when you hit it: options, choice, cost. Not batched at the end, not buried in the PR. If the decision changes scope, product behavior, or an API contract, **stop and ask** instead of choosing.

## 1 — Read the ticket

Fetch with `mcp__claude_ai_Atlassian__getJiraIssue` for a key or URL; use pasted text otherwise. Pull acceptance criteria, parent epic, linked tickets, attached designs.

Restate the criteria back in a few lines, including whatever the ticket is silent on that you'll have to decide. If it needs a backend change that doesn't exist, say so now — that's a `/handoff-doc`, and the FE half may not be shippable until it lands.

## 2 — Locate the cause, then plan

Trace it in the code and show the evidence (§Evidence before code). Find how sibling features already solve the same problem — matching surrounding patterns is the standard, not a preference.

**If the cause isn't obvious after a first pass** — it reproduces intermittently, spans multiple layers, or the first plausible theory doesn't fully explain the symptom — load the `diagnosing-bugs` skill and run its diagnosis loop instead of guessing further. It decides *how* to hunt the cause; §Evidence before code above still decides what counts as proof before any code gets written.

Then give a **3-line plan plus the file list** before touching anything. If it touches more than three files, wait for confirmation. This checkpoint exists because late corrections cost reverts; a 30-second redirect here is the cheap version.

## 3 — Branch

**Check for an existing branch for this ticket first and commit onto it** — don't cut a second one. If the user says stay on the current branch, stay on it.

Otherwise `feature/{TICKET}-{short-subject}`, ≤60 chars, off the epic's consolidation branch if one exists, else `develop`. State the base you picked.

**Finding the consolidation branch:** check memory for an epic feature-branch plan (`to-tickets` writes one — see its `references/epic-git-workflow.md` — when it set up a multi-ticket epic). If this ticket's parent matches that plan's epic, the consolidation branch is the plan's feature branch, and the PR in Step 8 targets it instead of `develop`/`main`. After that PR merges, check the plan for the next ticket whose blockers are done and continue automatically, same standing approval as the rest of this loop — stop only when the plan is exhausted, the user interrupts, or something needs a human call. No matching plan means no epic branch: proceed as standalone.

## 4 — Implement

Minimal, per the rule above.

**Drive it test-first via the `tdd` skill (red-green-refactor)** whenever there's a clear pass/fail signal to hang a test on — a bug fix especially, since the fail-before/pass-after proof Step 5 requires falls out of doing this instead of being written after the fact. Skip it only for changes with nothing to assert against (pure config, copy, styling) or when the user has said not to.

**Comments: one short line, only where intent is non-obvious, always self-contained.** Never restate what the code does. A comment that only makes sense next to the ticket or "as discussed" has failed at being a comment. No ticket numbers in comments. This has been asked for repeatedly — do not make it a fourth time.

## 4.5 — Sweep the blast radius

**Trigger:** the change touches how a value is represented — a new field for an existing concept, an enum gaining or losing a value, a flag becoming a mode, a mapper's output shape. Especially when you added a *second* spelling of something instead of changing the one spelling.

Enumerate **every producer and consumer of that representation**, not just the call site the ticket named. Grep every construction path of the type you touched — `new X()`, `X.builder()`, MapStruct `*Mapper` methods, `objectMapper.convertValue(..., X.class)`, Jackson entry points — and for each, answer out loud: *what does this emit for the field I just changed?* A path that emits nothing is a finding, not a default.

Three things make these misses invisible, so don't wait for a signal: MapStruct doesn't error on an unmapped target; the missing value is usually `null`, which often has a plausible meaning in the new contract; and nothing fails at compile or run time. Silence is not evidence the other paths are fine.

State the sweep's scope in your report — "swept N producers, all correct" is a result. An unstated sweep is indistinguishable from no sweep.

Anything you find outside this ticket's scope gets **surfaced and offered, never bundled** into the current PR.

## 5 — Verify

**Scope test runs to what you changed.** Do not launch the full suite unprompted.

```bash
npm run lint
npx vitest run <paths of touched tests>
```

Long builds go to the background — report once and move on. **Do not poll.** Exit code 0 means it passed; don't re-run to re-confirm.

For a bug, the test should fail before the fix and pass after — show both runs. For anything visual, run the app and look (`run` skill; `commit-screenshot` for before/after). Screenshots belong in the PR.

**Never say verified for something you didn't run.** Report failures with the real output.

## 6 — Self-review the diff

Invoke the `code-review` skill on the diff before the PR. Fix what's real, say what you dismissed and why. Also re-check the paths you didn't touch but could have broken — self-introduced regressions in adjacent device types have slipped through before.

**Then read the diff once more against this repo's own vetted vocabulary** — `codebase-design` (seams, leverage, locality, the deletion test) and `scoville-code-anti-ai-slop` (no premature abstraction, no scope creep) — the same second pass `sdlc-pipeline` runs before a Plan/Implement gate. Name any real concern in the PR description or in conversation rather than smoothing it over; not every finding blocks the PR, but an unnamed one can't be weighed.

## 7 — Commit

Stage **by explicit path**. Never `git add -A` — the tree holds untracked handoff `.md` files and screenshots that must not be committed, and recovering from that has already cost a permanently lost file. Verify with `git diff --cached --name-only` first.

Message: `feat|fix({TICKET}): what the code does`. Let hooks run; on failure fix and make a **new** commit, never amend.

## 8 — PR and the Copilot loop

`pr-loop` owns the mechanics — PR creation, review request, wait, thread triage. Hold onto these through the handoff:

**The description describes.** One short paragraph on what and why, 2–3 bolded headings with plain bullets naming files and changes, testing, screenshots. ~15–25 lines. No template checklist, no acceptance criteria restated, no open questions or caveats, no tool footer. Caveats go to the user in conversation.

**Confirm before requesting reviewers** if the user hasn't seen the result yet — they've asked to eyeball a PR before Copilot gets pulled in.

**Copilot gets judgment, not compliance.** Fix what improves correctness, UX, a11y, or matches repo patterns. Resolve-without-change what's speculative, stylistic, or fights an intentional choice, and say why. Surface borderline calls. Known false positives to reject on sight are in memory — the vue-i18n `t(key, named, plural)` signature and the `noopener,noreferrer` OAuth popup comment.

Wait ~7–8 minutes after requesting; Copilot runs well behind pushes. Foreground `sleep` is blocked — use a background Bash call (`sleep 450`, `run_in_background: true`), which re-invokes you on exit. An empty queue only counts as clean if Copilot's latest review timestamp is after your last push.

## 9 — Close the loop on Jira

Comment what shipped and move the status. **Check the rendering format** — Markdown posted into a wiki-markup field renders literally and has needed a full rewrite before. Never carry a claim from the ticket or an older doc into an update without re-verifying it against current code.

## 10 — Publish the write-up

Publish a summary of the problem and the solution as an Artifact, and hand over the link.

**Load the `artifact-design` skill before writing the file** — it calibrates the treatment. This is a technical explainer for teammates, so it wants a polished utilitarian read, not an editorial hero.

Cover, in this order: the symptom as reported; the root cause with the evidence that proved it; the fix and what each part of it does; any trade-off or reversed decision, including drafts that turned out wrong; verification, with the fail-before/pass-after numbers; and whatever is still open.

**The page argues, it doesn't recap.** Find the one picture that carries the diagnosis — a call chain with the value dying at a known hop, a before/after state table, a timeline — and build the page around it. A page that only restates the PR description in bigger type isn't worth publishing.

Write it for someone who wasn't in the session: no ticket shorthand without expansion, no "as discussed", no session references. It should still read a year from now.

The artifact is private on publish. Say so when handing over the link, so the user knows sharing is their call.

## Done means

- Root cause was shown with evidence, not asserted.
- Representation changes swept across every producer, with the scope stated.
- Acceptance criteria met, each with a stated verification.
- Lint and scoped tests pass, output seen.
- Self-review run (`code-review`, plus `codebase-design`/`scoville-code-anti-ai-slop` judgment pass); findings fixed or consciously dismissed.
- PR open on the right base, description in-format, screenshots for visual work.
- Copilot threads all resolved, each fixed or dismissed with a reason.
- Jira updated and rendering correctly.
- Write-up published as an Artifact and the link handed over.
- Every trade-off already explained to the user in-flight.

Report a final checklist of done vs. blocked. If something is blocked, say so plainly rather than narrowing scope silently.
