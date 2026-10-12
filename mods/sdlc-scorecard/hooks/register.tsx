import { atom, read, update } from 'claude-code'
import type { EngineInterface as Api, Register } from 'claude-code'

import type { Board, Driver, GroupBy, GroupRow, LiveWorker } from '../types'
import { aggregate, leader, parse } from './aggregate'
import { elapsed, isActive, parseRunCommand, promptFileIn, summarize, visible, LINGER_MS } from './live'

const PANE = 'sdlc-scorecard'
const board = atom({ plugin: 'sdlc-scorecard', key: 'board' } as const, null)
const groupBy = atom({ plugin: 'sdlc-scorecard', key: 'groupBy' } as const, 'phase')
const driver = atom({ plugin: 'sdlc-scorecard', key: 'driver' } as const, 'all')
const mtime = atom({ plugin: 'sdlc-scorecard', key: 'mtime' } as const, 0)
const live = atom({ plugin: 'sdlc-scorecard', key: 'live' } as const, [])

const ENDED = new Set(['completed', 'failed', 'killed'])

async function promptText($: Api, file: string | null, fallback: string): Promise<string> {
  if (!file) return summarize(fallback)
  const text = await $.fs.read(file).catch(() => null)
  return summarize(text ?? fallback)
}

async function track($: Api, w: LiveWorker): Promise<void> {
  await update($, live, ws => [...ws.filter(x => x.id !== w.id), w])
}

// Subagents end by their status in $.agent.list(); shell workers when their script writes
// meta.json. Always writes a fresh list, so an open pane redraws and its elapsed times tick.
async function refreshLive($: Api): Promise<void> {
  const now = await $.clock.now()
  const agents = new Map((await $.agent.list().catch(() => [])).map(a => [a.id, a]))
  const ws = await read($, live)
  const next: LiveWorker[] = []
  for (const w of ws) {
    if (!isActive(w)) {
      if (now - w.endedAt! < LINGER_MS) next.push(w)
      continue
    }
    if (w.source === 'agent') {
      const a = agents.get(w.id)
      // Dropped from the list: it ended a while ago. Missing in its first seconds: not listed yet.
      if (!a) next.push(now - w.startedAt > 10_000 ? { ...w, status: 'completed', endedAt: now } : w)
      else next.push({ ...w, status: a.status, endedAt: ENDED.has(a.status) ? now : null })
    } else {
      const stat = w.metaPath ? await $.fs.stat(w.metaPath).catch(() => null) : null
      next.push(stat && stat.mtimeMs >= w.startedAt ? { ...w, status: 'completed', endedAt: now } : w)
    }
  }
  await update($, live, () => next)
}

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
  await refreshLive($)
  await $.ui.open({ id: PANE, title: 'Model scorecard' })
  poll?.cancel()
  poll = $.clock.every(5000, () => void Promise.all([refresh($), refreshLive($)]))
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

  // Records every subagent as it starts; the hook only observes, so the spawn goes through unchanged.
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (!('agentId' in r) || !r.agentId) return r
    await track($, {
      id: r.agentId, source: 'agent', model: r.model, title: e.description || e.subagentType,
      prompt: await promptText($, promptFileIn(e.prompt), e.prompt),
      startedAt: await $.clock.now(), endedAt: null, status: 'running', metaPath: null,
    })
    return r
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const run = parseRunCommand(e.command)
    if (!run) return next(e)
    const id = `${run.script}:${run.out ?? e.command}`
    const startedAt = await $.clock.now()
    await track($, {
      id, source: run.script,
      model: run.effort ? `${run.model} (${run.effort})` : run.model,
      title: `${run.script}.sh${run.resume ? ' resume' : ''}${run.out ? ` → ${run.out.split('/').slice(-4).join('/')}` : ''}`,
      prompt: await promptText($, run.promptFile, ''),
      startedAt, endedAt: null, status: 'running',
      metaPath: run.out ? `${run.out}/meta.json` : null,
    })
    const r = await next(e)
    // A foreground call is over when it returns; a background one ends on its meta.json.
    if (!e.run_in_background) {
      const end = await $.clock.now()
      await update($, live, ws => ws.map(w => (w.id === id ? { ...w, status: 'completed', endedAt: end } : w)))
    }
    return r
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
