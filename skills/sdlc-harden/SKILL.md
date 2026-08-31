---
name: sdlc-harden
description: Run the full gated, multi-phase SDLC pipeline to harden an application toward the ideal architecture for its stack and domain — researching current industry best practices first, then auditing the codebase against them, planning the target architecture, implementing, and reviewing with a mandatory security pass. Use when the user asks to harden, secure, make production-ready, or bring an app up to best practices/industry standards; improve-codebase-architecture still owns a bare "find refactor opportunities" with no research or security mandate attached, and security-review still owns a one-off review of the current diff.
---

# SDLC: Harden

Thin entry point into `sdlc-pipeline` for `kind: harden`. Unlike `feature`/`fix`/`redesign`,
hardening isn't a new idea that needs framing, and it's rarely a visual-direction change — it's
an audit-and-upgrade of the *existing* architecture against externally researched best practices
(security, resilience, maintainability), which is why the pipeline gives `kind: harden` its own
phase shape: Discovery and Design are skipped, and Research is never skipped the way it can be
for a small feature — see `sdlc-pipeline`'s phase table for the detail.

1. Capture what's being hardened (the whole app, one service, one concern like auth or
   dependency hygiene) and what's driving it, in the user's own words.
2. Derive a short kebab-case `slug` for it. Ask if nothing obvious presents itself.
3. Invoke the Skill tool with `sdlc-pipeline`, passing `kind: harden`, the `request`, and the
   `slug`.

Do no research, auditing, or implementation work yourself here. `sdlc-pipeline` runs
`scoville-research` first to gather current best practices for this stack and domain (OWASP/CIS-
style security checklists, architecture patterns for the relevant scale and domain), then feeds
those findings into `improve-codebase-architecture` to target the ideal architecture, and always
runs `security-review` during Review regardless of size — hardening without a security pass
isn't hardening.
