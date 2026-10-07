import { atom, read, update } from 'claude-code'
import type { EngineInterface as Api, Register } from 'claude-code'

import type { Board, Driver, GroupBy, GroupRow } from '../types'
import { aggregate, leader, parse } from './aggregate'

const PANE = 'sdlc-scorecard'
const board = atom({ plugin: 'sdlc-scorecard', key: 'board' } as const, null)
const groupBy = atom({ plugin: 'sdlc-scorecard', key: 'groupBy' } as const, 'phase')
const driver = atom({ plugin: 'sdlc-scorecard', key: 'driver' } as const, 'all')
const mtime = atom({ plugin: 'sdlc-scorecard', key: 'mtime' } as const, 0)

async function logPath($: Api): Promise<string> {
  const custom = await $.env.get('SDLC_SCORECARD')
  if (custom) return custom
  return `${(await $.env.get('HOME')) ?? ''}/.sdlc/scorecard.jsonl`
}

// Re-reads only when the file changed, so the 5s poll costs one stat while nothing happens.
async function refresh($: Api, force = false): Promise<void> {
  const path = await logPath($)
  const now = await $.clock.now()
  const by = await read($, groupBy)
  const drv = await read($, driver)
  const stat = await $.fs.stat(path).catch(() => null)
  if (!stat) {
    await update($, board, () => ({ ...empty(path, now), error: 'No scorecard yet. It fills as dual runs complete.' }))
    return
  }
  if (!force && stat.mtimeMs === (await read($, mtime))) return
  try {
    const text = await $.fs.read(path)
    await update($, mtime, () => stat.mtimeMs)
    await update($, board, () => aggregate(parse(text), by, path, now, drv))
  } catch (err) {
    await update($, board, () => ({ ...empty(path, now), error: `Couldn't read ${path}: ${String(err)}` }))
  }
}

function empty(path: string, readAt: number): Board {
  return {
    path, phaseRecords: 0, groups: [], recent: [], readAt, error: null,
    totals: { sonnetTokens: 0, codexTokens: 0, opusTokens: 0 },
  }
}

const k = (n: number) => (n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
const cell = (s: string | number, w: number) => String(s).slice(0, w).padEnd(w)
const num = (s: string | number, w: number) => String(s).padStart(w)

let poll: { cancel: () => void } | null = null

async function openPane($: Api, by?: GroupBy): Promise<void> {
  if (by) await update($, groupBy, () => by)
  await refresh($, true)
  await $.ui.open({ id: PANE, title: 'Model scorecard' })
  poll?.cancel()
  poll = $.clock.every(5000, () => void refresh($))
}

export const register: Register = on => {

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scorecard',
      description: 'Sonnet vs Codex dual-run scorecard: /scorecard [phase|task]',
    })
    return next(e)
  })

  on('command.run', { command: 'scorecard' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const by: GroupBy | undefined = arg.startsWith('task') ? 'task_type' : arg.startsWith('phase') ? 'phase' : undefined
    await openPane($, by)
    return { text: 'Scorecard pane opened.' }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    poll?.cancel()
    poll = null
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, board)
    const by = await read($, groupBy)
    const drv = await read($, driver)
    const NEXT_DRIVER: Record<Driver, Driver> = { all: 'claude', claude: 'codex', codex: 'all' }
    const driverButton = (
      <Button
        key="driver"
        label={`Driven by: ${drv}`}
        onPress={async () => {
          await update($, driver, () => NEXT_DRIVER[drv])
          await refresh($, true)
        }}
      />
    )
    const toggle = (
      <Button
        key="group"
        label={by === 'phase' ? 'Group by task type' : 'Group by phase'}
        onPress={async () => {
          await update($, groupBy, () => (by === 'phase' ? 'task_type' : 'phase'))
          await refresh($, true)
        }}
      />
    )

    if (!b || b.error || b.groups.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{b?.error ?? 'No dual runs recorded yet.'}</Text>
          <Text dimColor>{b?.path ?? ''}</Text>
          {b && !b.error && driverButton}
        </Box>
      )
    }

    const label = by === 'phase' ? 'Phase' : 'Task type'
    const row = (g: GroupRow) => {
      const lead = leader(g)
      const judged = g.agreeWithSynth + g.disagreeWithSynth
      return (
        <Box key={g.key}>
          <Text bold={lead !== null}>{cell(g.key, 20)}</Text>
          <Text>{num(g.n, 4)}  </Text>
          <Text color="claude">{num(g.sonnet.wins, 4)}</Text>
          <Text color="suggestion">{num(g.codex.wins, 4)}</Text>
          <Text dimColor>{num(g.ties, 4)}  </Text>
          <Text color="claude">{num(`${g.sonnet.keptPct}%`, 5)}</Text>
          <Text color="suggestion">{num(`${g.codex.keptPct}%`, 5)}  </Text>
          <Text color="claude">{num(g.sonnet.uniqueCatches, 4)}</Text>
          <Text color="suggestion">{num(g.codex.uniqueCatches, 4)}  </Text>
          <Text color={g.sonnet.errors > g.codex.errors ? 'error' : 'claude'}>{num(g.sonnet.errors, 4)}</Text>
          <Text color={g.codex.errors > g.sonnet.errors ? 'error' : 'suggestion'}>{num(g.codex.errors, 4)}  </Text>
          <Text dimColor>{num(k(g.sonnet.avgTokens), 6)}{num(k(g.codex.avgTokens), 6)}  </Text>
          <Text>{judged ? `${g.agreeWithSynth}/${judged}` : '-'}</Text>
          {lead && <Text color="success"> → {lead} only?</Text>}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>{b.phaseRecords} scored sub-tasks  </Text>
          <Text color="claude">■ Sonnet  </Text>
          <Text color="suggestion">■ Codex  </Text>
          {toggle}
          <Text> </Text>
          {driverButton}
        </Box>
        <Text> </Text>
        <Text dimColor>
          {cell(label, 20)}{num('n', 4)}  {num('wins S/C/tie', 12)}  {num('kept S/C', 10)}  {num('unique S/C', 8)}  {num('errors', 8)}  {num('avg tok S/C', 12)}  you agree
        </Text>
        {b.groups.map(row)}
        <Text> </Text>
        <Text dimColor>
          Total tokens: Sonnet {k(b.totals.sonnetTokens)} · Codex {k(b.totals.codexTokens)} · Opus synthesis {k(b.totals.opusTokens)}
        </Text>
        <Text dimColor>{drv === 'all' ? 'Mixing drivers: Codex-driven runs use gpt-6-sol, Claude-driven gpt-6.1-sol. Filter by driver to compare like with like.' : ''}</Text>
        <Text dimColor>"you agree": your pick at the gate matched the blind synthesizer's winner. "→ X only?": 8+ runs, 75%+ wins — review before routing.</Text>
        <Text> </Text>
        <Text bold>Recent</Text>
        {b.recent.map(r => (
          <Text key={r.id}>
            <Text color={r.winner === 'sonnet' ? 'claude' : r.winner === 'codex' ? 'suggestion' : 'subtle'}>{cell(r.winner, 7)}</Text>
            <Text>{cell(r.id, 34)} </Text>
            <Text dimColor>{r.driver === 'codex' ? 'via Codex · ' : ''}</Text>
            <Text dimColor>{r.preferred ? `you: ${r.preferred} · ` : ''}{r.rationale}</Text>
          </Text>
        ))}
        <Text dimColor>{b.path}</Text>
      </Box>
    )
  })
}
