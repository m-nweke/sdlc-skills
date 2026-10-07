# Scorecard

Append-only JSONL at `$SDLC_SCORECARD` (default `~/.sdlc/scorecard.jsonl`), written only through
`scripts/scorecard.py`. It's deliberately **outside** this repo: records name real projects and the
repo is public. The `sdlc-scorecard` mod (`mods/sdlc-scorecard/`) draws its dashboard from it;
`scorecard.py summary [--by phase|task_type]` prints the same numbers in a terminal.

Records share an `id` of `<run>:<phase>:<subtask>`. A phase record and its gate record join on it;
a later record with the same id (a Revise's new attempt) supersedes the earlier one in summaries.

## Phase record (from `scorecard.py compose`)

| Field | Meaning |
| --- | --- |
| `project`, `run`, `kind`, `size` | Which project and pipeline run; `run` is the slug |
| `phase`, `subtask`, `task_type`, `attempt` | What was dual-run (see **Task types** in `SKILL.md`) |
| `branches.sonnet` / `branches.codex` | `status` (done/relay/failed), `tokens`, `duration_s`, `relays`; Codex also `effort`, input/cached/output tokens |
| `synthesis.items` | Kept items: `both`, `sonnet_only`, `codex_only`, `synth_added`, `total` |
| `synthesis.dropped`, `synthesis.errors` | Per model: items cut, and items that were wrong |
| `synthesis.unique_catches` | Per model: short names of important kept items only it found |
| `synthesis.winner`, `rationale` | Blind verdict, unblinded with `blind_key` |
| `artifact` | Link to the merged Claude Doc |

## Gate record (`scorecard.py add`, written by the orchestrator at each gate)

```json
{"type": "gate", "run": "<slug>", "phase": "plan", "subtask": "spec",
 "decision": "approve|revise|regenerate|skip", "preferred": "merged|sonnet|codex|unsure",
 "concern_flagged": true, "note": "user's reason, in their words, if they gave one"}
```

`preferred` is the user's own read, independent of the synthesizer's. When the two disagree often
for a task type, the synthesizer's judgment there isn't trustworthy yet — that's worth knowing
before letting it pick for you.

## Turning it into routing

The goal is one model per task type where the evidence supports it. A task type is a candidate to
drop to a single model when **all** hold:

- at least 8 phase records for it (across runs, not attempts of one run);
- one model wins ≥ 75% of them, and the other's `unique_catches` there are rare and minor;
- the user's `preferred` agrees with the synthesizer at least as often as not;
- the winner's error rate there is no worse than the loser's.

When one qualifies, propose it to the user (with the numbers); don't switch silently. Record the
decision in `routing.md` beside the scorecard (`~/.sdlc/routing.md`): task type, model, date,
evidence. `dual-run` callers read that file and run a routed task type on its one model — still
writing a scorecard record with only that branch, so drift stays visible.
