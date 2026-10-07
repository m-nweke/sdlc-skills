---
name: dual-run
description: Run one task through Sonnet and Codex (gpt-6.1-sol) in parallel from the identical prompt, then have a blind Opus synthesizer merge the best of both into one non-redundant artifact and score which model contributed what. Mechanism used by sdlc-pipeline for every phase; also usable directly for any task worth a second model's blind spots ("dual-run this", "get both models on this").
---

# Dual run

One task, two independent workers, one blind synthesis, one scorecard record. The point is each
model covering the other's blind spots now, and an honest record of who is better at what so the
flow can later route each kind of task to a single model.

This is a mechanism, like `fan-out-fan-in`: it owns *how* a task runs on two models, not what the
task is. The caller (usually `sdlc-pipeline`'s master orchestrator) supplies the task.

## Roles

| Role | Runs on | Sees |
| --- | --- | --- |
| Caller / orchestrator | Opus (the session) | Prompts, ≤10-line reports, the scorecard line. Never a draft. |
| Worker S | Sonnet, via the Agent tool (`model: "sonnet"`) | The task prompt only |
| Worker C | Codex `gpt-6.1-sol`, via `scripts/codex-run.sh` | The same task prompt only |
| Synthesizer | Opus, via the Agent tool (`model: "opus"`) | Both drafts, labeled **A** and **B** only |

Workers never see each other's output. The synthesizer never learns which label is which model
until the record is written — it's Claude judging Claude against Codex, so blinding is what keeps
the scorecard honest. (Style can still give a draft away; the synthesizer is told not to guess and
not to weigh style.)

## Inputs

- `run_dir` — the run's working folder (from `sdlc-pipeline`: `<run root>/<slug>`)
- `phase`, `subtask` — e.g. `plan` / `spec`; `subtask` is the unit the scorecard tracks
- `task_type` — the comparable kind of work, from **Task types** below
- `prompt` — the full, self-contained task prompt (the caller's job; same rules as any spawn prompt)
- `mode` — `draft` (produces a document) or `code` (edits a repo)
- `effort` — Codex reasoning effort: `low` | `medium` | `high` (mirrors the tier the caller would
  otherwise have picked; Sonnet is always the Claude worker)
- `repo` — for `code` mode, the repo the worktrees branch from

`<dir>` below means `<run_dir>/<phase>/<subtask>/attempt-<n>/` (`n` starts at 1; a Revise is a new attempt).

## 1. Prepare

1. Write `<dir>/prompt.md`: the caller's prompt, then the **Worker contract** below, verbatim.
   Both workers get this exact file. The only per-worker difference is the output location, which
   goes in a final line appended per worker: `Your output location: <dir>/<label>/` — where
   `<label>` is that worker's blind label.
2. Flip a coin for the blind key (e.g. `python3 -c "import random;print(random.choice('AB'))"` gives
   Codex's label) and write `<dir>/key.json`, e.g. `{"A": "codex", "B": "sonnet"}`. Workers write
   to `<dir>/A/` and `<dir>/B/`, so nothing on disk names a model next to a draft.
3. `code` mode only: create one git worktree per label from `repo`'s current HEAD, at
   `<dir>/A/wt` and `<dir>/B/wt`, on branches named per the project's conventions (see
   `company-conventions`; if a branch-naming rule isn't recorded yet, ask before creating them).
   Each worker's output location is its worktree.

## 2. Launch both, in one message

Send both calls in the same message, both in the background:

- **Sonnet:** Agent tool, `model: "sonnet"`, `run_in_background: true`, prompt = "Read
  `<dir>/prompt.md` and do exactly what it says. Your output location: `<dir>/<S label>/`." (Point
  at the file rather than pasting it, so both workers provably got the same text.)
- **Codex:** Bash, `run_in_background: true`:
  ```bash
  cat <dir>/prompt.md > <dir>/<C label>/prompt.md
  echo "Your output location: <dir>/<C label>/" >> <dir>/<C label>/prompt.md
  <sdlc-skills>/scripts/codex-run.sh --out <dir>/<C label>/codex --cwd <repo or project root> \
    --prompt-file <dir>/<C label>/prompt.md --effort <effort> --sandbox workspace-write \
    --schema <sdlc-skills>/skills/dual-run/references/worker-report.schema.json
  ```
  `workspace-write` because it must write its draft or edit its worktree; `--cwd` is the project
  root in draft mode, its worktree in code mode. Never `danger-full-access`. In draft mode, a
  draft-only task must not edit project files — the worker contract says so, and a non-empty
  `git status` outside `<run_dir>` afterwards counts as an error in the ledger.

`<sdlc-skills>` is wherever this repo is cloned; resolve it from this skill's own path (it's a
symlink into the repo).

Wait for both. Don't read Codex's `events.jsonl` — it's the whole session; `last.md` is its report.

## 3. Relays

Either worker can stop with `status: relay` (context budget, or a question only the user can
answer — the same **Relay protocol** as `sdlc-pipeline`).

- **Questions:** collect both workers' questions, merge duplicates (same decision, different
  wording → one question), and ask the user once with `AskUserQuestion`. Then continue each worker
  with the answers that concern it, in parallel: Sonnet with `SendMessage` to its agent (context
  intact; if that agent is gone, spawn a continuation pointed at its handoff), Codex with
  `codex-run.sh --resume <thread_id from codex/meta.json>` and a prompt file holding the answers.
  The answer goes to both even if only one asked — they must stay on the same inputs.
- **Context budget:** continue that worker the same way, prompt "continue from your handoff".
- A worker that fails outright (error, empty draft, Codex exit ≠ 0): retry once. If it fails again,
  proceed with one draft — the synthesizer still runs (it reviews and cleans up a single draft),
  and the record marks that branch `failed`. Tell the user which model failed and why, in one line.

Count each worker's relays; the scorecard records them.

## 4. Synthesize (blind)

Spawn the synthesizer: Agent tool, `model: "opus"`, prompt = the template in
`references/synthesizer.md` with its placeholders filled. It writes the merged artifact, a
provenance ledger, and `<dir>/synthesis.json`, then reports ≤12 lines: the artifact link, the
blind winner and why, concerns for the gate, anything it couldn't resolve between the drafts.

In `code` mode the synthesizer picks one worktree as the base, ports specific improvements from the
other (tests, edge cases, a cleaner seam), runs the touched tests, and leaves the result on a
merged branch — it never pastes two implementations together.

## 5. Record

```bash
<sdlc-skills>/scripts/scorecard.py compose --synthesis <dir>/synthesis.json --key <dir>/key.json \
  --project <project> --run <slug> --kind <kind> --size <size> --phase <phase> --subtask <subtask> \
  --attempt <n> --codex-meta <dir>/<C label>/codex/meta.json --codex-effort <effort> \
  --sonnet-tokens <from the Agent result> --sonnet-duration <seconds> --sonnet-relays <k> \
  --synth-tokens <from the synthesizer's Agent result> \
  [--sonnet-status failed | --codex-status failed]
```

The Agent tool's result reports each subagent's token use and duration — take Sonnet's and the
synthesizer's from there. Codex's come from `meta.json`.

The user's verdict is recorded at the gate, not here (see `references/scorecard.md`, gate record).

## Worker contract

Append this to every `prompt.md`, verbatim:

> You are one of two independent workers given this identical task. Do the whole task yourself, as
> well as you can; don't hedge toward a "safe middle" answer. Write your output to the output
> location given at the end of this prompt (a draft at `draft.md` there, or, in code mode, commits
> in the worktree there). Don't modify any file outside that location. You cannot talk to the user: if the work needs an answer only the user
> can give, or your context is filling up, stop and write `handoff.md` in your output location
> (done so far, what remains, the exact next step), then report `status: relay` with the questions
> shaped as AskUserQuestion parameters. Finish with a report of exactly these fields — status,
> draft_path, summary (≤10 lines), questions, concerns, files_touched — and nothing else.

## Task types

The scorecard compares models per `task_type`, so name the kind of work, not the ticket. Use one of
these; add a new one only when nothing fits, and tell the user you added it.

| Phase | Task types |
| --- | --- |
| discovery | `problem-framing`, `requirements` |
| research | `tech-research`, `ux-research`, `best-practices` |
| design | `ux-candidates`, `design-build`, `design-tokens` |
| plan | `spec`, `architecture`, `domain-model`, `ticket-breakdown` |
| implement | `tests`, `implementation`, `bug-diagnosis` |
| review | `review-correctness`, `review-security`, `review-ui` |
| ship | `release-notes`, `pr-description`, `conflict-resolution` |

## Splitting a phase into sub-tasks

When a phase has distinct kinds of work (Plan: spec, then tickets; Implement: tests, then code),
dual-run each as its own `subtask` with its own `task_type` rather than the phase as one blob — a
model that's better at tests but worse at implementation is only visible that way, and that's the
granularity the eventual "one model per task" routing needs.
