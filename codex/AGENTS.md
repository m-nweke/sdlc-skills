<!-- sdlc-skills:codex:start -->
## sdlc-skills on Codex

The sdlc-skills library (installed under `~/.agents/skills`) is written in Claude Code vocabulary.
The skills are the same files on both hosts; when one names a Claude Code tool or path, use the Codex
equivalent below. Keep each skill's *behavior* (gates, rounds, artifacts, handoffs); only the
mechanism changes.

| Skill says | Do this in Codex |
| --- | --- |
| `AskUserQuestion` tool | Use a structured question tool if one is exposed (e.g. `request_user_input`). Otherwise send one message holding only the questions: numbered, each with 2–4 lettered options, your recommendation first and marked, plus "other: ___". Then stop and wait. Never bury a question in prose. |
| "invoke / use the `X` skill", Skill tool, `/X` | Open `~/.agents/skills/X/SKILL.md` (or `$REPO/.agents/skills/X/SKILL.md`) and follow it. The user types `$X`. |
| Agent tool, "spawn a sub-agent / phase-orchestrator" | `spawn_agent`, then `wait` for results. `subagent_type: "Explore"` → `explorer`; general-purpose / `"claude"` / omitted → `default` or `worker`. Never fork the current thread for phase work. |
| Named agent (e.g. `design-review`) | Custom agent from `~/.codex/agents/<name>.toml`. If `spawn_agent` can't select it by name, read that TOML and pass its `developer_instructions` as the spawned agent's prompt. |
| `run_in_background: true`, "all in a single message" | Spawn every independent agent before waiting on any of them, then collect results together. |
| `model: haiku` / `sonnet` / `opus` / `fable`, or cheap / standard / strong tier | Keep the configured model; set reasoning effort `low` / `medium` / `high` / `high`. |
| Nested spawn refused (subagent spawning a subagent) | `agents.max_depth` is too low (default 1). Do the sub-tasks one after another, writing each result to its own file, and tell the user they can raise `max_depth` to 3. |
| `environment: "cloud"` | Run locally. |
| Subagents unavailable (`[agents]` disabled) | Run each branch sequentially in this thread, still writing each branch's output to its own file, then synthesize. Say that you did. |
| `mcp__claude-in-chrome__*` | Whatever browser-automation MCP is configured (Playwright, Chrome DevTools, …). If none, use the skill's documented heuristic fallback and say so. |
| `CLAUDE.md` | `AGENTS.md` |
| `~/.claude/` (skills, agents, settings.json, hooks, memory) | `~/.agents/skills/`, `~/.codex/agents/`, `~/.codex/config.toml`, `~/.codex/AGENTS.md` |
| Transcripts at `~/.claude/projects/<slug>/*.jsonl` (`recall`, `reflect`) | Codex session logs under `~/.codex/sessions/` (dated subfolders of `rollout-*.jsonl`); filter to this workspace by the `cwd` recorded in each file. |
| `/compact` | `/compact` |
| `TodoWrite` / `TaskCreate` | `update_plan` |
| `WebSearch` / `WebFetch` | Codex web search if enabled, else `curl`. |
| Built-in `code-review` / `/code-review` | `/review`, or the `sdlc-code-review` skill. |
| Built-in `security-review` | `/review` scoped to security, or `sdlc-code-review`'s security fan-out. Never skip it where a skill makes it mandatory. |
| Background `sleep` to poll (e.g. Copilot review) | Run the wait as a normal shell command, then re-check. |
<!-- sdlc-skills:codex:end -->
