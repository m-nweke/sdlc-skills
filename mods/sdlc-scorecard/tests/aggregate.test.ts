import { expect, test } from 'claude-code/testing'

import { aggregate, leader, parse } from '../hooks/aggregate'

const phase = (run: string, phase: string, task: string, winner: string, ts: string) => ({
  type: 'phase', id: `${run}:${phase}:${task}`, run, phase, subtask: task, task_type: task, project: 'acme', ts,
  branches: { sonnet: { tokens: 1000 }, codex: { tokens: 3000 } },
  synthesis: {
    winner, rationale: `${winner} won`, tokens: 500,
    items: { total: 10, both: 4, sonnet_only: 3, codex_only: 2, synth_added: 1 },
    errors: { sonnet: 0, codex: 1 }, unique_catches: { sonnet: ['a'], codex: [] },
  },
})

test('groups by phase, counts wins, kept share and tokens', async () => {
  const text = [
    JSON.stringify(phase('r1', 'plan', 'spec', 'sonnet', '2026-10-01')),
    JSON.stringify(phase('r2', 'plan', 'spec', 'codex', '2026-10-02')),
    JSON.stringify(phase('r2', 'review', 'review-correctness', 'tie', '2026-10-03')),
    '{"type":"phase", broken',
  ].join('\n')
  const b = aggregate(parse(text), 'phase', '/x', 0)
  const plan = b.groups.find(g => g.key === 'plan')!
  expect(plan.n).toBe(2)
  expect(plan.sonnet.wins).toBe(1)
  expect(plan.codex.wins).toBe(1)
  expect(plan.sonnet.keptPct).toBe(70)
  expect(plan.codex.keptPct).toBe(60)
  expect(plan.codex.errors).toBe(2)
  expect(b.totals.codexTokens).toBe(9000)
  expect(b.recent[0]!.id).toBe('r2:review:review-correctness')
})

test('a revised attempt supersedes the earlier record, and gates join on id', async () => {
  const recs = [
    phase('r1', 'plan', 'spec', 'sonnet', '2026-10-01'),
    phase('r1', 'plan', 'spec', 'codex', '2026-10-02'),
    { type: 'gate', id: 'r1:plan:spec', run: 'r1', phase: 'plan', subtask: 'spec', decision: 'approve', preferred: 'codex' },
  ]
  const g = aggregate(recs, 'task_type', '/x', 0).groups[0]!
  expect(g.n).toBe(1)
  expect(g.codex.wins).toBe(1)
  expect(g.agreeWithSynth).toBe(1)
  expect(g.preferred.codex).toBe(1)
})

test('flags a routing candidate only with 8+ runs and a 75% win rate', async () => {
  const many = (wins: number, n: number) =>
    Array.from({ length: n }, (_, i) => phase(`r${i}`, 'implement', 'tests', i < wins ? 'codex' : 'sonnet', `2026-10-${i + 1}`))
  expect(leader(aggregate(many(6, 7), 'phase', '/x', 0).groups[0]!)).toBe(null)
  expect(leader(aggregate(many(6, 8), 'phase', '/x', 0).groups[0]!)).toBe('codex')
  expect(leader(aggregate(many(5, 8), 'phase', '/x', 0).groups[0]!)).toBe(null)
})
