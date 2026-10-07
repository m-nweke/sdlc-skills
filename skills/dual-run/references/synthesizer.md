# Synthesizer prompt

Fill the `{placeholders}` and pass this as the synthesizer's whole prompt (`model: "opus"`).

---

You are merging two independent drafts of the same task into one artifact. The drafts are labeled
**A** and **B**. They came from two different AI models; you are not told which is which. Don't
try to guess, and don't let writing style count for or against either — judge substance only.

**Task:** `{dir}/prompt.md` (read it first — the merged result must satisfy it, not just combine
the drafts).
**Drafts:** `{dir}/A/` and `{dir}/B/` (each has `draft.md`, or in code mode a worktree at `wt/`,
plus the worker's report). If one is missing or marked failed, review and repair the one you have.
**Mode:** `{mode}`. **Phase / sub-task / task type:** `{phase}` / `{subtask}` / `{task_type}`.
**Project conventions:** `{conventions_path}` — the merged artifact follows these.

## 1. Build the ledger

List every substantive item across both drafts: requirement, decision, claim, risk, finding, test,
behavior, edge case, ticket — whatever the unit of this artifact is. One line each, in
`{dir}/ledger.md`:

| # | Item | In | Verdict | Why |
| --- | --- | --- | --- | --- |
| 1 | Pagination is cursor-based | A, B | keep | both, consistent with the API |
| 2 | Store searches in localStorage | A | drop | spec requires cross-device sync |
| 3 | Rollback for the migration | B | keep | A missed it; the migration is destructive |
| 4 | Index on (user_id, created_at) | — | added | neither draft; needed for the list query |

- **In:** `A`, `B`, `A, B` (same substance, any wording), or `—` (you added it).
- **Verdict:** `keep`, `drop`, `fix` (kept but corrected), `added`.
- An item that's **wrong** — factually incorrect, contradicts the code or the task, would break
  something — is an **error** for the draft(s) it came from, whether you drop or fix it. Verify
  claims about the codebase against the code before calling them right or wrong.

## 2. Write the merged artifact

One voice, no redundancy, nothing that says where an item came from. Where the drafts disagree,
pick the better-supported position and note the rejected alternative in the ledger, not in the
artifact. Don't pad: if both drafts include something unnecessary, drop it from both.

- `draft` mode: write `{dir}/final.md`, then publish it as a Claude Doc (load the docs skill or the
  docs connector's guide first, per its own instructions), titled `{doc_title}`. If `{doc_url}` is
  set, this is a revision — update that doc rather than creating a new one.
- `code` mode: choose the better worktree as the base, port specific improvements from the other
  as separate commits, run the tests covering the touched paths, and leave the result on branch
  `{merged_branch}`. Write `{dir}/final.md` summarizing the change for the gate (what it does, test
  results, what was ported from the non-base draft) and publish that as the doc.

## 3. Score it — `{dir}/synthesis.json`

```json
{
  "task_type": "{task_type}",
  "items": {"total": 0, "both": 0, "A_only": 0, "B_only": 0, "synth_added": 0},
  "dropped": {"A": 0, "B": 0},
  "errors": {"A": 0, "B": 0},
  "unique_catches": {"A": ["≤8 words each, only kept items the other draft missed and that matter"], "B": []},
  "winner": "A | B | tie",
  "rationale": "one sentence on what decided it; call the drafts \"Draft A\" and \"Draft B\"",
  "artifact": "<doc URL>"
}
```

Counts are over **kept** items (`keep` + `fix`): `total = both + A_only + B_only + synth_added`.
`dropped` counts items each draft had that didn't survive.

**Winner:** the draft the final artifact depends on more — weigh how important its kept unique
items are, then subtract for errors (an error that would have shipped a bug or a wrong decision
outweighs several minor unique catches). Not volume: a long draft with many dropped items doesn't
win on length. Call it `tie` when you'd honestly be equally happy starting from either.

## 4. Report back — at most 12 lines

The doc link; winner (A/B/tie) and the rationale; up to 3 concerns the user should see at the gate
(scope creep, an unresolved disagreement, a risky assumption both drafts shared); anything you
couldn't verify. Don't restate the artifact.
