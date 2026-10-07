import type { Board, GroupBy, GroupRow, ModelCol, RecentRow } from '../types'

// Mirrors scripts/scorecard.py in sdlc-skills: a later record with the same id supersedes the
// earlier one, and a gate record joins its phase record on that id.
type Rec = Record<string, any>
const MODELS = ['sonnet', 'codex'] as const

const emptyCol = (): ModelCol => ({ wins: 0, keptPct: 0, errors: 0, uniqueCatches: 0, avgTokens: 0 })

export function parse(text: string): Rec[] {
  const out: Rec[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // A half-written last line while scorecard.py appends; the next read picks it up.
    }
  }
  return out
}

export function aggregate(recs: Rec[], groupBy: GroupBy, path: string, readAt: number): Board {
  const phases = new Map<string, Rec>()
  const gates = new Map<string, Rec>()
  for (const r of recs) {
    if (r.type === 'phase') phases.set(r.id, r)
    else if (r.type === 'gate') gates.set(r.id, r)
  }

  const groups = new Map<string, GroupRow>()
  const totals = { sonnetTokens: 0, codexTokens: 0, opusTokens: 0 }
  for (const r of phases.values()) {
    const key = String(r[groupBy] ?? '?')
    let g = groups.get(key)
    if (!g) {
      g = {
        key, n: 0, ties: 0, sonnet: emptyCol(), codex: emptyCol(), gated: 0,
        preferred: { merged: 0, sonnet: 0, codex: 0 }, agreeWithSynth: 0, disagreeWithSynth: 0,
      }
      groups.set(key, g)
    }
    const syn = r.synthesis ?? {}
    const items = syn.items ?? {}
    const total = Math.max(items.total ?? 0, 1)
    g.n += 1
    if (syn.winner === 'tie') g.ties += 1
    for (const m of MODELS) {
      const col = g[m]
      if (syn.winner === m) col.wins += 1
      col.keptPct += ((items.both ?? 0) + (items[`${m}_only`] ?? 0)) / total
      col.errors += syn.errors?.[m] ?? 0
      col.uniqueCatches += (syn.unique_catches?.[m] ?? []).length
      col.avgTokens += r.branches?.[m]?.tokens ?? 0
    }
    totals.sonnetTokens += r.branches?.sonnet?.tokens ?? 0
    totals.codexTokens += r.branches?.codex?.tokens ?? 0
    totals.opusTokens += syn.tokens ?? 0

    const gate = gates.get(r.id)
    const pref = gate?.preferred
    if (pref === 'merged' || pref === 'sonnet' || pref === 'codex') {
      g.gated += 1
      g.preferred[pref as 'merged' | 'sonnet' | 'codex'] += 1
      if (pref !== 'merged' && syn.winner !== 'tie') {
        if (pref === syn.winner) g.agreeWithSynth += 1
        else g.disagreeWithSynth += 1
      }
    }
  }

  for (const g of groups.values()) {
    for (const m of MODELS) {
      g[m].keptPct = Math.round((100 * g[m].keptPct) / g.n)
      g[m].avgTokens = Math.round(g[m].avgTokens / g.n)
    }
  }

  const recent: RecentRow[] = [...phases.values()]
    .sort((a, b) => String(b.ts ?? '').localeCompare(String(a.ts ?? '')))
    .slice(0, 6)
    .map(r => ({
      id: r.id,
      project: r.project ?? '',
      winner: r.synthesis?.winner ?? '?',
      rationale: r.synthesis?.rationale ?? '',
      preferred: gates.get(r.id)?.preferred ?? null,
    }))

  return {
    path,
    phaseRecords: phases.size,
    groups: [...groups.values()].sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)),
    recent,
    totals,
    readAt,
    error: null,
  }
}

// Routing candidate per skills/dual-run/references/scorecard.md; the user's agreement and error
// checks there need the full records, so this only flags where to look.
export function leader(g: GroupRow): 'sonnet' | 'codex' | null {
  if (g.n < 8) return null
  if (g.sonnet.wins / g.n >= 0.75) return 'sonnet'
  if (g.codex.wins / g.n >= 0.75) return 'codex'
  return null
}
