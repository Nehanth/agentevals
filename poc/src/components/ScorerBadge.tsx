import { useState } from 'react'
import type { Assessment } from '../types'
import { SCORER_LABELS } from '../types'
import * as S from '../styles'

type Verdict = 'pass' | 'fail' | 'neutral'

function classify(value: string | boolean | number): Verdict {
  const v = String(value).toLowerCase()
  if (v === 'yes' || v === 'true') return 'pass'
  if (v === 'no' || v === 'false') return 'fail'
  return 'neutral'
}

const VERDICT_STYLES: Record<Verdict, string> = {
  pass: 'text-pass bg-pass-muted',
  fail: 'text-fail bg-fail-muted',
  neutral: 'text-warn bg-warn-muted',
}

const VERDICT_DOT: Record<Verdict, string> = {
  pass: S.dot.pass,
  fail: S.dot.fail,
  neutral: S.dot.warn,
}

export default function ScorerBadge({
  assessment,
  compact = false,
  defaultExpanded = false,
}: {
  assessment: Assessment
  compact?: boolean
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const label = SCORER_LABELS[assessment.assessment_name] ?? assessment.assessment_name
  const value = assessment.feedback?.value ?? assessment.error?.error_message ?? '—'
  const verdict: Verdict = assessment.error ? 'fail' : classify(value)
  const isHuman = assessment.source.source_type === 'HUMAN'

  if (compact) {
    return (
      <span
        title={`${label}: ${String(value)}`}
        className={`inline-block w-2 h-2 ${VERDICT_DOT[verdict]}`}
      />
    )
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition cursor-pointer hover:opacity-80 ${VERDICT_STYLES[verdict]}`}
      >
        <span className={`w-1.5 h-1.5 ${VERDICT_DOT[verdict]}`} />
        <span className="font-medium">{label}</span>
        {isHuman && (
          <span className="text-[10px] font-semibold text-human bg-human-muted px-1 rounded">
            Human
          </span>
        )}
        <span className="ml-auto font-mono opacity-70 uppercase">{String(value)}</span>
        {assessment.rationale && (
          <svg
            className={`w-3 h-3 opacity-40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {expanded && assessment.rationale && (
        <div className="mt-1 px-3 py-2 text-xs text-text-secondary bg-surface-overlay rounded-md leading-relaxed">
          {assessment.rationale}
        </div>
      )}
    </div>
  )
}
