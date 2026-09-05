# Grounded-citation mode

Source: adapted from Quext's `/demo` skill (`quext-skills/demo/SKILL.md`), which pairs a
source-grounded Lovable prototype with a Jira epic where every claim cites code.

The base `to-spec` template deliberately omits file paths and snippets from
Implementation Decisions — they go stale fast, and a spec is meant to survive some
drift. That default still holds for the common case: a spec one team keeps iterating on
together.

It inverts when the spec's destination is a ticket tracker where a *different* person
picks it up cold, with no chance to ask "wait, does this component already exist?"
before starting — an epic filed for another engineer, or for an agent working the
ticket in a fresh session days later. There, staleness risk is smaller than the cost of
an unverified claim: a claim that turns out to be wrong doesn't just need correcting, it
was trusted and built on. Use this mode when that's the shape of the handoff; keep the
default otherwise. If unsure which applies, ask.

## What changes

**No claim without a citation.** Every "this reuses X" or "the backend already has Y"
gets a file path and line, a migration id, or a config key — not asserted from memory or
a plausible guess. If you can't point at it, go find it or mark it explicitly unverified;
don't round an assumption up to a fact because it's probably true.

**Ground before writing, not while writing.** Before drafting Implementation Decisions:
search the frontend repo for what already implements adjacent behavior (grid/table
patterns, filter components, design tokens) and note *why* something exists, not just
that it does — a single-select filter usually means a single-value backend field, which
makes "add multi-select" a backend change, not a frontend tweak. Read the backend's
`CLAUDE.md` first for documented traps (auth/permission seeding, pagination limits,
OpenAPI coverage) before reading entities/controllers/migrations.

**Verify data assumptions, don't design around guesses.** Name every assumption the
spec depends on (an enum's real value set, a field's null rate, whether history is
clean). Check what you can against the actual data (a database MCP, a fixture, a test
seed) — schema-qualified queries, distinct values, null rates, uniqueness. What you
can't check gets listed under a dedicated **Unverified Assumptions** addition to the
spec template, each with an owner and what would confirm it. Never promote an
unverified assumption to a stated fact because the deadline is close.

**Record rejected alternatives with the evidence that killed them.** Add a short
**Rejected Alternatives** note (folded into Implementation Decisions or Further Notes)
for anything a reviewer might otherwise "fix" back — the alternative, and the fact that
ruled it out. Undocumented reversals get silently re-proposed.

**Gate before publishing:** every planned element in the spec maps to a real component,
a real field, or is explicitly flagged new; every data assumption is either sourced or
listed as unverified with an owner. A spec with no citations and no unverified list
hasn't done this pass — it's using the default template, which is fine, just say so
rather than mixing modes.
