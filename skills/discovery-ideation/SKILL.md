---
name: discovery-ideation
description: Frame a raw idea, problem statement, or feature request into a stress-tested written brief before any research, design, or code architecture starts. Use when the user proposes a new feature or product idea from scratch, states a vague problem ("users are churning", "we should do something with X") without a clear ask, or asks whether something is worth building at all.
---

# Discovery & Ideation

The entry point of the SDLC pipeline. Nothing here gets researched, designed, or built until it survives this step. The output is a **brief** — a short written artifact the research and design phases read next, not a conversational answer.

## 1. Capture the raw input

Get the idea or problem statement in the user's own words. If it's vague ("we should do something with churn"), anchor it before ideating on a guess: use the `AskUserQuestion` tool with the interpretations you can see as options (your best read as the recommended one), rather than a plain-text clarifying question.

## 2. Grill it

Invoke `mattpocock-skills:grilling` on the idea before writing anything down. Grilling is not optional polish — it's the mechanism that turns a raw idea into something worth briefing. Let it stress-test:
- the problem framing itself (is this the real problem, or a symptom?)
- assumptions baked into the ask
- alternatives not considered
- why this, why now

Completion: the idea has been genuinely contested, not rubber-stamped. If grilling surfaces a materially different problem than the one captured in step 1, that's the real problem — brief that one.

## 3. Write the brief

Synthesize what survived grilling into a markdown file with these sections:

- **Problem statement** — the sharpened version, post-grilling
- **Why now** — the evidence or trigger behind this surfacing now
- **Options considered** — including "do nothing," with the case for/against each
- **Recommendation** — which option, and why
- **Non-goals** — what this explicitly does not attempt to solve
- **Open questions** — anything unresolved that research or design must answer next

Save to `docs/discovery/<slug>.md` in the current repo (create the directory if it doesn't exist), where `<slug>` is a short kebab-case name for the idea. Tell the user the path when done.

Completion criterion: every section above is filled in with real content — no section left as a placeholder or TBD without being listed under Open questions.
