---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. Transcripts live at `~/.claude/projects/<slug>/` where `<slug>` is the workspace path with the leading slash dropped and each "/" turned into "-". Do not read transcripts from other project slugs — that crosses workspace boundaries.

```bash
ls -t ~/.claude/projects/<slug>/*.jsonl 2>/dev/null | head -10
```

For each candidate, read the first JSONL line and check that the first user message content contains the conversation's opening prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three Agent tool calls, explicit `model:` on each. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript).

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | `"fable"` | `references/judgment-reviewer.md` |
| Tooling | `"sonnet"` | `references/tooling-reviewer.md` |
| Divergent | `"opus"` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the Agent response body.

### 3. Synthesize

One Agent call, `model: "fable"`. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): write the changes directly to the SKILL.md file at `~/.claude/skills/<skill-name>/SKILL.md`, following the frontmatter + markdown format of existing skills in the repo.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): edit the `description:` field in the SKILL.md frontmatter directly.
- `new skill: <kebab-name>`: create `~/.claude/skills/<kebab-name>/SKILL.md` following the existing skill format. Do not invent the shape ad hoc — copy the frontmatter structure from a sibling skill.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
