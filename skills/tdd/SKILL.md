---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle: consult them before and during the loop, not after.

When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Confirm through the `AskUserQuestion` tool, not a plain-text ask: list the candidate seams you found while exploring the code as the options (your recommended set first), so the user picks or corrects rather than free-typing an interface list from scratch.

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), call the Skill tool with "codebase-design" for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.

## Running tests: full suite at the ends, blast radius in between

Before the first cycle, check how expensive this repo's suite actually is: how many test files exist, whether the runner reports a baseline run time, and whether any tests need external services (DB, network, browser) that make them slow or flaky. Don't assume — a small repo's full suite may already be sub-second, making all of this moot.

If the full suite is cheap (roughly a few seconds), just run it every cycle and skip the rest of this section.

If it's expensive, bookend the work with the full suite and scope everything in between to blast radius:

- **Beginning**: run the full suite once before the first red, so you know the repo's starting state and aren't chasing pre-existing failures as if you caused them.
- **During each red-green cycle**: run only the tests in the blast radius of the change — the seam under test plus its dependents — using the runner's own filtering, not a guess at which files matter:
  - Jest/Vitest: the specific test file path, or `--findRelatedTests <changed files>`.
  - pytest: `pytest path/to/test_file.py::TestClass::test_name` or `-k <pattern>`.
  - Go: `go test ./path/to/package/...`.
  - RSpec: `rspec path/to/spec.rb:LINE`.

  Prefer the tool's native "run related/changed tests" feature over hand-picking paths — it accounts for imports/dependents you'd otherwise miss. If a change touches a widely-imported module or shared fixture/config, treat the blast radius as the full suite for that cycle — narrow scoping can't see cross-module breakage there.
- **End**: run the full suite once more before declaring the work done or handing off to review. Scoping speeds up the loop; it never replaces this final check.
