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

`swarm` is the other parallel mechanism here, and the boundary is: this skill is for **read-only**
research and scanning where branches cover different slices and the results need reconciling into
one answer. Workers that write, race each other on one brief, or run in the cloud are `swarm`.
Callers pick one; neither calls the other.

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

## Model tiers

This table is the one definition of model tiers for every parallel step in this repo. Callers
name a tier; the model follows from it.

| Tier | Claude Code | Codex | Use for |
| --- | --- | --- | --- |
| cheap | `haiku` | reasoning effort `low` | extraction, grep-and-read, one fixed question per branch |
| standard | `sonnet` | `medium` | branches that must judge relevance or read unfamiliar code |
| strong | `opus` (or `fable` where available) | `high` | the synthesizer; lead judgment |

## Choosing N

**N is the number of natural slices, capped at 6.** Count the modules, source lanes, code paths or
angles that exist; don't pad up to a target and don't split one slice to reach one. Past 6,
cluster neighbouring slices (same file, same module, same source) until you're at 6 or fewer.
Each extra branch costs a spawn plus one more report the merge has to read.

- **1 slice** — don't fan out. Do it directly.
- **2 slices** — two parallel agents are fine when they're independent reads (e.g. two review
  lenses); the caller merges inline. No synthesizer.
- **3+ slices** — fan out, then pick the merge below.

Cheap first: if a slice can be answered by one `grep` or one file read, answer it before spawning
and drop it from the fan-out.

## The two roles

**Fan-out agents** (the branches) each get:

- A distinct, bounded slice — a different source lane, module, subsystem, path cluster, or angle,
  never the same prompt copy-pasted N times unless running the consensus variant on purpose.
- The **cheap** tier by default; **standard** only when the branch has to judge, not just extract.
- Read-only scope and an explicit *stop* condition so it doesn't quietly expand past its slice.
- Its own fresh context window.
- An output file to write its report to (see **Branch reports** below).

**The merge (fan-in)** is one of two shapes:

- **Inline** — the caller reads the reports and reconciles them itself. Use when N ≤ 3, or when
  the caller must look at every finding anyway (a self-review whose fixes it will make, a sweep
  whose gaps it must close). A synthesizer here only adds a second full read.
- **Synthesizer agent** — one **strong**-tier agent gets the report *file paths* and reconciles.
  Use when N ≥ 4, or whenever the caller's own context is the thing being protected (the
  `sdlc-pipeline` master orchestrator, a phase-orchestrator near budget). Its prompt is
  categorically different from the branches' — never "go research this," always "here is what N
  agents found, reconcile it":
  - Merge genuine overlaps; keep outliers only one branch found; flag direct contradictions
    between branches rather than silently picking one; rank by the caller's criteria.
  - Reconcile only — never re-research, never fill a gap a branch left by guessing.

## Branch reports

Every branch returns the same shape, so the merge compares like with like instead of parsing N
free-form essays. Write it to `<run-dir>/branch-<n>-<slice>.md` (the caller names `<run-dir>`:
the pipeline's `docs/pipeline/<slug>/`, or the OS temp dir for a one-off) and return only the path
plus a one-line headline. The raw report then never enters the caller's context unless the caller
chooses to read it.

```
## Slice: <what this branch covered>
## Findings
- F1 | <claim> | evidence: <file:line, URL, or command + output> | confidence: high/med/low
- F2 | ...
## Inspected
<files, sources, queries — so the merge can see coverage>
## Gaps
<what this slice could not resolve, and why — "none" is a valid answer>
```

## Prompt template

Fan-out agent prompt shape:

```
You are one of N agents researching/scanning [question/area] in parallel, each covering a
different angle. Your slice: [specific bounded scope]. Stay read-only. Write your report to
[branch file path] in exactly the branch-report format below, then reply with only that path and
a one-line headline. Stop once your slice is covered — don't expand into neighboring territory.

[branch-report format]
```

Synthesizer prompt shape:

```
N agents independently investigated [question/area], each covering a different slice. Their full
reports are in the files listed below; read every one. Do not re-research or verify claims
yourself — reconcile what's here. Merge genuine overlaps into single findings. Keep every outlier that only one agent surfaced, don't
drop it for being unique. Flag any direct contradiction between two branches rather than silently
choosing one. Score/rank the findings by [the criteria the calling skill defines]. Return a
synthesis, not a concatenation.

[branch report paths]
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
`improve-codebase-architecture`). Record, alongside the result, N, which slices were clustered or
answered without a branch, the tier each role ran on, and whether the merge was inline or a
synthesizer — the same way the rest of this repo tracks agent count and model choice per step — that
history is what lets N and model choice get tuned later instead of guessed at again each time.
