---
name: company-conventions
description: Look up, or establish by asking, the current company's and project's process conventions — tracker, branch and commit naming, PR rules, naming standards, where docs live, definition of done — before any skill acts on one. Use when a skill is about to name a branch, write a ticket or commit, open a PR, pick a doc location, or otherwise follow a process rule; or when the user says "our conventions are…", "we name things…", "at this company we…".
---

# Company conventions

Process rules change from company to company, and nothing in this repo's skills is a safe default
for them: examples that mention Jira keys, epic branches, a Copilot reviewer, or a particular
branch prefix are illustrations from somewhere else, not rules here. **The only conventions in force
are the ones recorded in the conventions files below, confirmed by the user.**

## Where they live

- **Company:** `~/.sdlc/conventions.md` — applies to every project at the current company.
- **Project:** `<project root>/.sdlc/conventions.md` — overrides the company file for one repo.
  Keep `.sdlc/` out of the company's repo: add it to `.git/info/exclude` (local-only), never to
  their `.gitignore` unless the user asks.

Both are outside this public repo on purpose. If the user changes companies again, move the old
company file aside (`~/.sdlc/conventions.<old-company>.md`) and start fresh; never carry rules over.

## Looking one up

Read the project file, then the company file; the first one that covers the topic wins. If neither
does, establish it (below) before acting — don't fall back to a guess, a skill's example, or what
the last company did.

## Establishing one

Ask only for what the current task needs, when it needs it — not a questionnaire up front.

1. **Look for evidence first.** Recent branch names (`git branch -r`, `git log --format=%s -50`),
   `CONTRIBUTING*`, `.github/` or `.gitlab/` templates, PR/MR templates, `CODEOWNERS`, lint/commit
   hooks, the README, an existing `docs/` layout. Evidence makes better options; it never replaces
   asking.
2. **Ask with `AskUserQuestion`.** Offer what you detected as the first option, labeled with where
   it came from ("Detected: `feat/<ticket>-<desc>` (last 30 branches)"), plus one or two real
   alternatives. Up to 4 related topics per call.
3. **Record it** in the file the user's answer applies to (ask "company-wide or just this repo?"
   only when it isn't obvious), with the date and the source: `confirmed`, or
   `detected, confirmed`. Never record an unconfirmed guess.

## Topics

Each is a `##` section in the conventions file; record only the ones that have come up.

| Topic | What to pin down |
| --- | --- |
| Tracker | Which tool (or none), project key, ticket title/body format, statuses, who files tickets |
| Branches | Naming pattern, base branch, long-lived branches, worktree/branch naming for agent work |
| Commits | Message format (Conventional Commits or not), sign-off, ticket reference, squash policy |
| PRs / MRs | Host (GitHub, GitLab, …), base, template, required reviewers, required checks, draft-first, who merges |
| Review | What reviewers expect, AI-review tools in use, size limits |
| Naming | Files, components, services, DB tables/columns, env vars, feature flags |
| Docs | Where specs, ADRs, design docs and runbooks live; whether pipeline artifacts may go in the repo |
| Definition of done | Tests, coverage, docs, flags, analytics, accessibility, security sign-off |
| Release | Environments, deploy process, change management, release notes |
| Security / compliance | Data handling rules, secrets, regulated data, required reviews |
| Design | Design system, component library, where designs live |

## File format

```markdown
# Conventions — <company>   (or: <project> overrides)

## Branches
- Pattern: `feat/<TICKET>-<short-desc>`; base `main`. (confirmed 2026-10-07)
- Agent worktrees: `agent/<slug>-<label>`. (confirmed 2026-10-07)
```
