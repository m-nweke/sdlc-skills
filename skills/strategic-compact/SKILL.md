---
name: strategic-compact
description: Advisory guidance on when to run manual /compact at logical task-phase boundaries rather than waiting for arbitrary auto-compaction, plus lazy-loading and context-composition patterns for keeping baseline token usage low. Use when a session is approaching a context limit, or when deciding whether a phase boundary is a good place to compact.
---

# Strategic Compact

Advisory-only: suggests **when** it's a good idea to run `/compact` at strategic points in a workflow, rather than relying on arbitrary auto-compaction. This is judgment guidance, not an automated hook — nothing here enforces a suggestion or measures live token counts. (ECC's upstream version of this skill pairs it with a `suggest-compact.js` PreToolUse hook that reads real transcript token counts; that hook wasn't vendored here — set one up separately if you want the automated trigger instead of applying this judgment by hand.)

## When to Apply This Judgment

- Long sessions approaching context limits
- Multi-phase tasks (research → plan → implement → test) — this repo's own `sdlc-pipeline` phases are the concrete example
- Switching between unrelated tasks within the same session
- After completing a major milestone and starting new work
- When responses slow down or become less coherent (context pressure)

## Why Strategic Over Arbitrary

Auto-compaction triggers at arbitrary points:
- Often mid-task, losing important context
- No awareness of logical task boundaries
- Can interrupt complex multi-step operations

Strategic compaction at logical boundaries:
- **After exploration, before execution** — compact research context, keep the implementation plan
- **After completing a milestone** — fresh start for the next phase
- **Before major context shifts** — clear exploration context before a different task

## Compaction Decision Guide

| Phase Transition | Compact? | Why |
|-----------------|----------|-----|
| Research → Planning | Yes | Research context is bulky; the plan is the distilled output |
| Planning → Implementation | Yes | Plan is written down (a file, or a task list if the tools exist); free up context for code |
| Implementation → Testing | Maybe | Keep if tests reference recent code; compact if switching focus |
| Debugging → Next feature | Yes | Debug traces pollute context for unrelated work |
| Mid-implementation | No | Losing variable names, file paths, and partial state is costly |
| After a failed approach | Yes | Clear the dead-end reasoning before trying a new approach |

## What Survives Compaction

| Persists | Lost |
|----------|------|
| CLAUDE.md instructions | Intermediate reasoning and analysis |
| Files on disk | File contents you previously read |
| Memory files | Multi-step conversation context |
| Git state (commits, branches) | Tool call history and counts |
| The task list — **only if the todo tools are enabled** (see below) | Nuanced user preferences stated verbally |

> ### Don't rely on the task list surviving — it may be off by default
>
> Claude Code has, at points, shipped with the todo/task tools (`TodoWrite`,
> `TaskCreate/Get/Update/List`) off by default for some model families, restorable via an
> environment variable that is a per-machine setting and does **not** travel with this
> skill or this repo. Check whether those tools are actually present in the current
> session before counting on them.
>
> "My todo list survives compaction" is a reason people compact *instead of* writing
> state down. If the tools are absent there is no list to survive, and the plan is simply
> gone. **Write the plan to a file before compacting** — a file persists on every version
> and every model. Treat the task list as a convenience that may be missing, never as the
> durable record.

## Best Practices

1. **Compact after planning** — once the plan is finalized **and written to a file**, compact to start fresh
2. **Compact after debugging** — clear error-resolution context before continuing
3. **Don't compact mid-implementation** — preserve context for related changes
4. **Write before compacting** — save important context to files or memory before compacting
5. **Use `/compact` with a summary** — add a custom message: `/compact Focus on implementing auth middleware next`

## Token Optimization Patterns

### Trigger-Table Lazy Loading

Instead of loading full skill content at session start, use a trigger table that maps keywords to skill paths. Skills load only when triggered, reducing baseline context by 50%+. This repo's own `graphify` code-search routing and the `sdlc-*` entry-point descriptions (each names exactly what it's for, so it competes with nothing else for the same trigger — see `sdlc-pipeline`'s composition rule) are working examples of the same principle, not just a hypothetical:

| Trigger | Skill | Load When |
|---------|-------|-----------|
| "test", "tdd", "coverage" | `tdd` | User mentions testing |
| "security", "auth", "xss" | `security-review` | Security-related work |
| "clean up my config", "too many skills" | `config-gc` | Config bloat |

### Context Composition Awareness

Monitor what's consuming the context window:
- **CLAUDE.md files** — always loaded, keep lean
- **Loaded skills** — each skill adds roughly 1–5K tokens; run `context-budget` to measure the real number instead of guessing
- **Conversation history** — grows with each exchange
- **Tool results** — file reads, search results add bulk

### Duplicate Instruction Detection

Common sources of duplicate context:
- The same rule content in both `~/.claude` and `~/.claude-personal` (or project vs. user CLAUDE.md)
- Skills that repeat CLAUDE.md instructions
- Multiple skills covering overlapping domains — `config-gc`'s workflow exists specifically to catch this

## Related Skills

- `context-budget` — measures the token cost of what's loaded; use it to decide whether compacting or trimming components is the higher-leverage move.
- `config-gc` — the lasting fix for baseline bloat, as opposed to this skill's per-session compaction judgment.
