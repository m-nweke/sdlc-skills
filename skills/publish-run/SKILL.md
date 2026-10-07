---
name: publish-run
description: Publish the artifacts a Codex-driven sdlc pipeline run queued (it can't reach Claude Docs) as Claude Docs, and link them back into the run manifest. Use when the user says "publish run <slug>", "publish the queued docs", or when sdlc-pipeline reports an unpublished publish-queue.jsonl.
---

# Publish a run's queued artifacts

A Codex-driven run writes each merged artifact as markdown and appends it to
`<run root>/<slug>/publish-queue.jsonl`, because headless Claude has no claude.ai connectors. This
skill turns that queue into Claude Docs, so Docs stay the record for every run, whichever tool drove it.

1. **Find the queue.** The run root comes from the project's conventions (`company-conventions`;
   default `<project>/.sdlc/runs/`). With no slug given, list every `publish-queue.jsonl` that has
   unpublished entries and ask which runs to publish (`AskUserQuestion`, multiSelect).
2. **Read the entries.** Each line is `{"phase", "subtask", "attempt", "path", "title"}`; a later
   line with `"published": "<url>"` for the same phase/subtask/attempt marks it done. Per
   phase/subtask, publish only the latest attempt, and prefer `approved.md` beside `path` when it
   exists — that's what the gate accepted.
3. **Publish each one** as a Claude Doc titled per the entry (load the docs skill or the docs
   connector's guide first, per its own instructions). Publish the markdown as written; don't edit
   or re-summarize it — it's an approved artifact.
4. **Record it.** Append `{"phase", "subtask", "attempt", "published": "<doc url>"}` to the queue,
   and replace the artifact path with the doc link in the run manifest's **Artifact** column.
5. **Report** one line per doc: phase/subtask → link.

Don't publish entries whose gate hasn't approved them unless the user asks; the manifest's **Gate
decision** column says which ones were approved.
