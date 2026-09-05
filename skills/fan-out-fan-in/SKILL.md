---
name: fan-out-fan-in
description: Spawn multiple independent sub-agents in parallel over a research or codebase-scanning task, then reconcile their findings with one synthesizer agent. Use when a research or scan question is broad enough that several independent angles would surface more than one serial pass would (multi-source research, whole-codebase or multi-module scans), or when divergent/stochastic coverage matters more than a single best-guess answer. Not for narrow single-source lookups, implementation, or judgment calls that need rounds of back-and-forth (that's debate, not fan-out/fan-in).
---

# Fan-out / fan-in

A mechanism, not a task owner. This skill decides *how* to parallelize a research or scan
question that another skill has already framed — it never frames the question, picks the winner,
or implements anything. `scoville-research` owns question framing and evidence standards;
`improve-codebase-architecture` owns which deepening candidates make the report. Both call this
skill for the parallel-execution mechanism itself.

## When it's worth the overhead

Parallelizing has a fixed cost (spawn N agents, then reconcile). It pays off when:

- The question or codebase area is genuinely broad — several independent angles exist that a
  single serial pass would visit one after another, paying full context-growth cost as it goes.
- Divergence has value — different agents starting from the same question land on different
  findings (LLMs are stochastic; this is a feature, not noise). A narrow, single-answer lookup
  gets nothing from this and should stay a direct call.
- The work is read-only per branch (research, scanning, evaluating options) — not implementation,
  which has ordering and shared-state concerns fan-out doesn't handle.

Don't reach for this on a question answerable by one or two authoritative lookups, or on
judgment calls that need agents to see and react to each other's output across rounds — that's
**debate**, a different pattern (see Variants below).

## The two roles

**Fan-out agents** (the branches) each get:

- A distinct, bounded slice of the question or codebase — a different source lane, module,
  subsystem, or angle, never the same prompt copy-pasted N times unless running the consensus
  variant on purpose.
- A **cheap, fast model** (`sonnet`, or `haiku` for pure extraction with little reasoning) — this
  step is volume work: gathering, reading, extracting. It doesn't need the strongest model, and
  running it on one lets the fan-in step afford the strong model without the whole pass getting
  expensive.
- Read-only scope, sources/limits/gaps required in its report, and an explicit *stop* condition
  so it doesn't quietly expand past its slice.
- Its own fresh context window — that's what keeps each branch in good operating range instead of
  one long thread accumulating everything serially.

**Default N is 5** for a question or scan broad enough to warrant this pattern at all. Fewer than
that rarely produces enough divergence to be worth the reconciliation cost; there's no firm upper
bound, but each additional agent has to earn its keep against the token cost of running the
synthesizer over one more report.

**The synthesizer agent** (the fan-in) gets a categorically different prompt from the fan-out
agents — never "go research this," always "here is what N agents already found, reconcile it":

- A **stronger model** (`opus`) — this is the one step in the pass where reasoning quality
  actually matters, since it's making the calls that determine what the requester sees.
- Every branch's full report as input, not a summary of summaries.
- Explicit instructions to: merge genuine overlaps rather than listing them N times, keep
  outliers instead of discarding anything that only one branch found, flag direct contradictions
  between branches rather than silently picking one, and score or rank rather than just
  concatenating.
- It owns reconciliation and synthesis only — never re-research, never fill a gap a branch left
  by guessing.

## Prompt template

Fan-out agent prompt shape:

```
You are one of N agents researching/scanning [question/area] in parallel, each covering a
different angle. Your slice: [specific bounded scope]. Stay read-only. Report: what you found,
which sources/files you inspected, your confidence, and anything you couldn't resolve within
your slice. Stop once your slice is covered — don't expand into neighboring territory.
```

Synthesizer prompt shape:

```
N agents independently investigated [question/area], each covering a different slice. Their full
reports are below. Do not re-research or verify claims yourself — reconcile what's here. Merge
genuine overlaps into single findings. Keep every outlier that only one agent surfaced, don't
drop it for being unique. Flag any direct contradiction between two branches rather than silently
choosing one. Score/rank the findings by [the criteria the calling skill defines]. Return a
synthesis, not a concatenation.

[branch 1 report] [branch 2 report] ... [branch N report]
```

The calling skill fills in the bracketed scope, question, and ranking criteria — this skill only
supplies the shape.

## Variants

- **Stochastic consensus**: run the *same* question across N agents (not different slices) and
  tally which findings recur across branches (higher-confidence, majority signal) versus which
  appear in only one (either noise or a genuine outlier worth surfacing) — useful for filtering
  low-confidence claims without a heavyweight synthesizer, when the calling skill wants a
  confidence signal more than a merged report.
- **Debate**: agents see each other's output across rounds and revise, rather than reporting once
  into a blind synthesizer. Use this instead of plain fan-out/fan-in when the task is a judgment
  call needing back-and-forth (weighing trade-offs, resolving a genuinely contested question) —
  not owned by this skill; note the distinction so a caller doesn't reach for fan-out/fan-in on a
  question that actually needs rounds.

## Reporting back

Whatever skill invoked this returns the synthesizer's output as its own result — this skill
doesn't have its own final-report format, since the calling skill owns what "done" looks like
(a decision-ready research result for `scoville-research`, a candidate list for
`improve-codebase-architecture`). Record, alongside the result, how many agents ran and on which
models, the same way the rest of this repo tracks agent count and model choice per step — that
history is what lets N and model choice get tuned later instead of guessed at again each time.
