import { useState } from 'react'
import type { Agent, TraceWithAssessments, TriageEvent, TriageAction } from '../types'
import type { ScorerGroup } from './TriageFeed'
import { loadAllActions, setAction as persistAction } from '../triageStorage'
import * as S from '../styles'

export default function ScorerOccurrences({
  agent,
  group,
  onSelectTrace,
}: {
  agent: Agent
  group: ScorerGroup
  onSelectTrace: (trace: TraceWithAssessments, focusAssessmentId?: string) => void
}) {
  const [actions, setActions] = useState<Record<string, TriageAction>>(loadAllActions)

  const handleAction = (assessmentId: string, action: TriageAction | null) => {
    persistAction(assessmentId, action)
    setActions(loadAllActions())
  }

  const pending = group.events.filter((ev) => !actions[ev.assessment.assessment_id])
  const triaged = group.events.filter((ev) => actions[ev.assessment.assessment_id] === 'triaged')
  const dismissed = group.events.filter((ev) => actions[ev.assessment.assessment_id] === 'dismissed')

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className={`${S.card} p-4`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`w-2.5 h-2.5 ${S.dot.fail}`} />
          <h2 className="text-base font-semibold text-text-primary">{group.label}</h2>
          <span className={S.badge.fail}>
            {group.events.length} occurrence{group.events.length !== 1 ? 's' : ''}
          </span>
          {triaged.length > 0 && (
            <span className={S.badge.warn}>{triaged.length} triaged</span>
          )}
          {dismissed.length > 0 && (
            <span className={S.badge.muted}>{dismissed.length} dismissed</span>
          )}
        </div>
        <p className={S.meta}>
          This scorer evaluates{' '}
          {scorerDescription(group.scorerName)}.
          Review each occurrence below to decide what action to take.
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <Section label="Needs Review" count={pending.length}>
          {pending.map((ev) => (
            <OccurrenceRow
              key={ev.assessment.assessment_id}
              event={ev}
              action={null}
              onAction={(a) => handleAction(ev.assessment.assessment_id, a)}
              onClick={() => onSelectTrace(ev.trace, ev.assessment.assessment_id)}
            />
          ))}
        </Section>
      )}

      {/* Triaged */}
      {triaged.length > 0 && (
        <Section label="Triaged" count={triaged.length} muted>
          {triaged.map((ev) => (
            <OccurrenceRow
              key={ev.assessment.assessment_id}
              event={ev}
              action="triaged"
              onAction={(a) => handleAction(ev.assessment.assessment_id, a)}
              onClick={() => onSelectTrace(ev.trace, ev.assessment.assessment_id)}
            />
          ))}
        </Section>
      )}

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <Section label="Dismissed" count={dismissed.length} muted>
          {dismissed.map((ev) => (
            <OccurrenceRow
              key={ev.assessment.assessment_id}
              event={ev}
              action="dismissed"
              onAction={(a) => handleAction(ev.assessment.assessment_id, a)}
              onClick={() => onSelectTrace(ev.trace, ev.assessment.assessment_id)}
            />
          ))}
        </Section>
      )}

      {pending.length === 0 && triaged.length === 0 && dismissed.length === 0 && (
        <p className="text-center py-12 text-text-muted text-sm">No occurrences.</p>
      )}
    </div>
  )
}

function Section({
  label,
  count,
  muted,
  children,
}: {
  label: string
  count: number
  muted?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!muted)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-2 cursor-pointer group"
      >
        <svg
          className={`w-3 h-3 text-text-muted transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className={`text-xs font-semibold uppercase tracking-wide ${muted ? 'text-text-muted' : 'text-text-primary'}`}>
          {label}
        </span>
        <span className={S.meta}>({count})</span>
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}

function OccurrenceRow({
  event,
  action,
  onAction,
  onClick,
}: {
  event: TriageEvent
  action: TriageAction | null
  onAction: (action: TriageAction | null) => void
  onClick: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { assessment, trace } = event
  const date = new Date(assessment.create_time)
  const rationale = assessment.rationale ?? ''
  const duration = (trace.durationMs / 1000).toFixed(1)
  const isDismissed = action === 'dismissed'

  return (
    <div className={`${S.card} overflow-hidden transition ${
      isDismissed ? 'border-border-subtle opacity-60' : action === 'triaged' ? 'border-warn-border' : ''
    }`}>
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`w-1.5 h-1.5 shrink-0 mt-1.5 ${
          isDismissed ? S.dot.muted : action === 'triaged' ? S.dot.warn : S.dot.fail
        }`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary mb-1 truncate">{trace.input}</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {expanded ? rationale : rationale.length > 200 ? rationale.slice(0, 200) + '...' : rationale}
          </p>
          {rationale.length > 200 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className={`${S.link} mt-1 text-[11px]`}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={S.metaSmall}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={S.metaSmall}>{duration}s</span>
          {trace.tokenUsage && (
            <span className={S.metaSmall}>
              {trace.tokenUsage.total_tokens.toLocaleString()} tokens
            </span>
          )}
          <button
            type="button"
            onClick={onClick}
            className={`${S.link} mt-1 text-[11px]`}
          >
            Details &rarr;
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-surface-overlay/50 border-t border-border-subtle flex items-center gap-2">
        <span className={`${S.mono} truncate mr-auto`}>{trace.traceId}</span>

        {action === null ? (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAction('dismissed') }}
              className={S.btnGhost}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAction('triaged') }}
              className={S.btnWarn}
            >
              Triage
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAction(null) }}
            className={S.btnGhost}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}

function scorerDescription(name: string): string {
  const desc: Record<string, string> = {
    relevance_to_query: 'whether the response directly addresses the user\'s input',
    completeness: 'whether the agent addresses all parts of the user\'s prompt',
    fluency: 'grammatical correctness and natural language flow',
    safety: 'whether the response avoids harmful or toxic content',
    summarization: 'faithfulness, coverage, conciseness, and clarity of summaries',
    tool_call_correctness: 'whether tool calls and arguments are correct for the query',
    tool_call_efficiency: 'whether tool calls are efficient without redundancy',
    Length: 'response length classification (short, medium, long)',
  }
  return desc[name] ?? 'agent response quality'
}
