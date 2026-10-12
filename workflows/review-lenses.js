export const meta = {
  name: 'review-lenses',
  description: 'Run sdlc-code-review lenses in parallel, then try to refute every finding that is not high-confidence',
  whenToUse: 'The parallel step of sdlc-code-review on Claude Code. args: {target, spec, lenses, extra}',
  phases: [
    { title: 'Review', detail: 'one agent per lens' },
    { title: 'Verify', detail: 'one refuter per non-high-confidence finding' },
  ],
}

// args: {
//   target: what to review, e.g. "diff of HEAD against origin/develop" or "PR #123",
//   spec:   the ticket/spec text or where to read it,
//   lenses: subset of ['core', 'ui', 'security']; core always runs,
//   extra:  additional brief lines for the core lens,
// }
const { target, spec = 'none given', lenses = [], extra = [] } = args || {}
if (!target) throw new Error('review-lenses needs args.target')

const LENSES = {
  core: {
    skill: 'scoville-code-anti-ai-slop',
    brief: 'Run its two-axis Standards + Spec review of the target.',
    model: 'sonnet',
  },
  ui: {
    skill: 'scoville-ui-anti-ai-slop',
    brief: 'Audit the UI the target changes.',
    model: 'sonnet',
  },
  security: {
    skill: 'security-review',
    brief: 'Review the target for security issues.',
    model: 'opus',
  },
}

const FINDINGS = {
  type: 'object',
  required: ['findings', 'gaps'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['axis', 'title', 'location', 'evidence', 'severity', 'confidence'],
        properties: {
          axis: { type: 'string' },
          title: { type: 'string' },
          location: { type: 'string', description: 'file:line' },
          evidence: { type: 'string', description: 'the quoted line(s) or command output' },
          severity: { enum: ['high', 'medium', 'low'] },
          confidence: { enum: ['high', 'medium', 'low'] },
        },
      },
    },
    gaps: { type: 'string', description: 'what this lens could not resolve; "none" is valid' },
  },
}

const VERDICT = {
  type: 'object',
  required: ['verdict', 'reason'],
  properties: {
    verdict: { enum: ['confirmed', 'refuted', 'unverifiable'] },
    reason: { type: 'string' },
  },
}

const run = ['core', ...lenses.filter(l => l !== 'core' && LENSES[l])]

const lensPrompt = name => {
  const l = LENSES[name]
  const more = name === 'core' && extra.length ? `\nAlso:\n${extra.map(e => `- ${e}`).join('\n')}` : ''
  return `Invoke the ${l.skill} skill against this target: ${target}.
${l.brief} Spec it answers: ${spec}${more}
Report-only: change no files. Return every finding with file:line and the quoted evidence.`
}

const refute = (f, lens) => `A ${lens} review of ${target} reported this finding:
${f.title} at ${f.location} (${f.axis}, severity ${f.severity})
Evidence given: ${f.evidence}
Try to refute it. Read the code at that location and whatever it calls or is called by. Confirm it
only if the defect is real in the current code; refute it if the evidence is misread, already handled
elsewhere, or not a defect. Say unverifiable only if you cannot reach the code. Change no files.`

const results = await pipeline(
  run,
  name => agent(lensPrompt(name), { label: name, phase: 'Review', schema: FINDINGS, model: LENSES[name].model }),
  async (report, name) => {
    if (!report) return { lens: name, failed: true }
    const settled = report.findings.filter(f => f.confidence === 'high')
    const doubtful = report.findings.filter(f => f.confidence !== 'high')
    const verdicts = await parallel(doubtful.map((f, i) => () =>
      agent(refute(f, name), { label: `${name} #${i + 1}`, phase: 'Verify', schema: VERDICT, model: 'sonnet', effort: 'low' }),
    ))
    const checked = doubtful.map((f, i) => ({ ...f, check: verdicts[i] || { verdict: 'unverifiable', reason: 'verifier failed' } }))
    return {
      lens: name,
      skill: LENSES[name].skill,
      confirmed: [...settled, ...checked.filter(f => f.check.verdict === 'confirmed')],
      unverified: checked.filter(f => f.check.verdict === 'unverifiable'),
      refuted: checked.filter(f => f.check.verdict === 'refuted'),
      gaps: report.gaps,
    }
  },
)

return results.filter(Boolean)
