import type { LiveWorker } from '../types'

// How long a finished worker stays on the pane before it drops off.
export const LINGER_MS = 120_000

export type RunCommand = {
  script: 'codex-run' | 'claude-run'
  model: string
  effort: string | null
  promptFile: string | null
  out: string | null
  resume: boolean
}

const flag = (cmd: string, name: string): string | null => {
  const m = cmd.match(new RegExp(`--${name}\\s+(?:"([^"]*)"|'([^']*)'|(\\S+))`))
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null
}

// A Bash call that launches a dual-run worker through scripts/codex-run.sh or claude-run.sh.
export function parseRunCommand(command: string): RunCommand | null {
  const cmd = command.replace(/\\\n/g, ' ')
  const script = /codex-run\.sh\b/.test(cmd) ? 'codex-run' : /claude-run\.sh\b/.test(cmd) ? 'claude-run' : null
  if (!script) return null
  return {
    script,
    // Unset, codex-run.sh falls back to the Codex config default.
    model: flag(cmd, 'model') ?? (script === 'codex-run' ? 'codex (config default)' : 'claude'),
    effort: flag(cmd, 'effort'),
    promptFile: flag(cmd, 'prompt-file'),
    out: flag(cmd, 'out'),
    resume: /--resume\b/.test(cmd),
  }
}

// dual-run's Sonnet worker is told "Read `<dir>/prompt.md` and do exactly what it says": the
// real task lives in that file.
export function promptFileIn(prompt: string): string | null {
  const m = prompt.match(/Read `([^`]+prompt\.md)`/)
  return m ? m[1]! : null
}

// The first meaningful lines of a prompt, flattened to one line for the pane.
export function summarize(text: string, max = 160): string {
  const flat = text
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .filter(Boolean)
    .join(' ')
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export const isActive = (w: LiveWorker) => w.endedAt === null

// Running first, newest first; finished ones linger briefly, then drop.
export function visible(workers: LiveWorker[], now: number): LiveWorker[] {
  return workers
    .filter(w => w.endedAt === null || now - w.endedAt < LINGER_MS)
    .sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || b.startedAt - a.startedAt)
}

export function elapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`
}
