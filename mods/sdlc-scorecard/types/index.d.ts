export type GroupBy = 'phase' | 'task_type'
export type Driver = 'all' | 'claude' | 'codex'

export type ModelCol = {
  wins: number
  keptPct: number
  errors: number
  uniqueCatches: number
  avgTokens: number
}

export type GroupRow = {
  key: string
  n: number
  ties: number
  sonnet: ModelCol
  codex: ModelCol
  gated: number
  preferred: { merged: number; sonnet: number; codex: number }
  agreeWithSynth: number
  disagreeWithSynth: number
}

export type RecentRow = {
  id: string
  project: string
  winner: string
  rationale: string
  preferred: string | null
  driver: string
}

export type Board = {
  path: string
  phaseRecords: number
  groups: GroupRow[]
  recent: RecentRow[]
  totals: { sonnetTokens: number; codexTokens: number; opusTokens: number }
  readAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'sdlc-scorecard': { board: Board | null; groupBy: GroupBy; driver: Driver; mtime: number }
  }
}
