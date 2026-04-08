import { useState } from 'react'
import type { TraceWithAssessments, Assessment, Agent, TriageAction } from '../types'
import { SCORER_LABELS, DEFAULT_SCORERS } from '../types'
import { loadAllActions, setAction as persistAction } from '../triageStorage'
import * as S from '../styles'

function sortAssessments(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort((a, b) => {
    const ai = DEFAULT_SCORERS.indexOf(a.assessment_name)
    const bi = DEFAULT_SCORERS.indexOf(b.assessment_name)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

function classify(a: Assessment): 'pass' | 'fail' | 'neutral' {
  const v = String(a.feedback?.value ?? '').toLowerCase()
  if (v === 'yes' || v === 'true') return 'pass'
  if (v === 'no' || v === 'false') return 'fail'
  return 'neutral'
}

function label(a: Assessment): string {
  return SCORER_LABELS[a.assessment_name] ?? a.assessment_name
}

const ACTION_LABELS: Record<TriageAction, { text: string; cls: string }> = {
  triaged: { text: 'Triaged', cls: S.badge.warn },
  dismissed: { text: 'Dismissed', cls: S.badge.muted },
}

export default function DrillDown({
  agent,
  trace,
  focusAssessmentId,
}: {
  agent: Agent
  trace: TraceWithAssessments
  focusAssessmentId?: string
}) {
  const [actions, setActions] = useState<Record<string, TriageAction>>(loadAllActions)

  const handleAction = (assessmentId: string, action: TriageAction | null) => {
    persistAction(assessmentId, action)
    setActions(loadAllActions())
  }

  const sorted = sortAssessments(trace.assessments)
  const human = sorted.filter((a) => a.source.source_type === 'HUMAN')
  const judges = sorted.filter((a) => a.source.source_type !== 'HUMAN')
  const failures = judges.filter((a) => classify(a) === 'fail')

  const focusedFailure = failures.find((a) => a.assessment_id === focusAssessmentId) ?? failures[0]
  const otherFailures = failures.filter((a) => a !== focusedFailure)

  const relatedHuman = focusedFailure
    ? human.filter((h) => h.assessment_name === focusedFailure.assessment_name)
    : []
  const otherHuman = human.filter((h) => !relatedHuman.includes(h))

  const date = new Date(trace.timestamp)
  const duration = (trace.durationMs / 1000).toFixed(1)
  const mlflowUrl = `http://localhost:5001/#/experiments/${agent.experimentId}/traces?selectedEvaluationId=${trace.traceId}`

  return (
    <div className="flex flex-col gap-4">
      {/* Compact header */}
      <div className={`${S.card} px-4 py-3 flex items-center gap-4 flex-wrap`}>
        <p className={S.mono}>{trace.traceId}</p>
        <span className={S.meta}>{date.toLocaleString()}</span>
        <span className={S.meta}>{duration}s</span>
        {trace.tokenUsage && (
          <span className={S.meta}>{trace.tokenUsage.total_tokens.toLocaleString()} tok</span>
        )}
        <span className={`text-xs ${trace.status === 'OK' ? 'text-pass' : 'text-fail'}`}>{trace.status}</span>
        <a
          href={mlflowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${S.btnPill} ml-auto bg-accent-muted text-accent hover:bg-accent hover:text-white`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10l3-3m-3 3l-3-3M15 7v10m0-10l3 3m-3-3l-3 3" />
          </svg>
          Trace Waterfall
        </a>
      </div>

      {/* Primary failure */}
      {focusedFailure && (
        <FocusedFailureCard
          assessment={focusedFailure}
          action={actions[focusedFailure.assessment_id] ?? null}
          onAction={(a) => handleAction(focusedFailure.assessment_id, a)}
          relatedHuman={relatedHuman}
        />
      )}

      {/* User query & Agent response */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${S.card} p-4`}>
          <h3 className={`${S.sectionLabel} mb-2`}>User Input</h3>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{trace.input}</p>
        </div>
        <div className={`${S.card} p-4`}>
          <h3 className={`${S.sectionLabel} mb-2`}>Agent Response</h3>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{trace.output}</p>
        </div>
      </div>

      {/* Other failures */}
      {otherFailures.length > 0 && (
        <div className={`${S.card} p-4`}>
          <h3 className={`${S.sectionLabelFail} mb-3`}>
            Other Issues ({otherFailures.length})
          </h3>
          <div className="flex flex-col gap-2">
            {otherFailures.map((a) => (
              <FailureRow
                key={a.assessment_id}
                assessment={a}
                action={actions[a.assessment_id] ?? null}
                onAction={(act) => handleAction(a.assessment_id, act)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other human feedback */}
      {otherHuman.length > 0 && (
        <div className="bg-human-muted/50 border border-human-border rounded-lg p-4">
          <h3 className={`${S.sectionLabelHuman} mb-3`}>
            Other Human Feedback ({otherHuman.length})
          </h3>
          <div className="flex flex-col gap-2">
            {otherHuman.map((a) => (
              <HumanRow key={a.assessment_id} assessment={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButtons({
  action,
  onAction,
}: {
  action: TriageAction | null
  onAction: (a: TriageAction | null) => void
}) {
  if (action) {
    const { text, cls } = ACTION_LABELS[action]
    return (
      <div className="flex items-center gap-2">
        <span className={cls}>{text}</span>
        <button
          type="button"
          onClick={() => onAction(null)}
          className="text-xs text-text-muted hover:text-text-primary cursor-pointer transition"
        >
          Undo
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onAction('dismissed')}
        className={S.btnGhost}
      >
        Dismiss
      </button>
      <button
        type="button"
        onClick={() => onAction('triaged')}
        className={S.btnWarn}
      >
        Triage
      </button>
    </div>
  )
}

function FocusedFailureCard({
  assessment,
  action,
  onAction,
  relatedHuman,
}: {
  assessment: Assessment
  action: TriageAction | null
  onAction: (a: TriageAction | null) => void
  relatedHuman: Assessment[]
}) {
  return (
    <div className={`rounded-lg p-5 transition ${
      action === 'dismissed'
        ? 'bg-surface-overlay/60 border border-border-subtle opacity-70'
        : action === 'triaged'
          ? 'bg-warn-muted/40 border border-warn-border'
          : 'bg-fail-muted/40 border border-fail-border'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 ${
          action === 'dismissed' ? S.dot.muted : action === 'triaged' ? S.dot.warn : S.dot.fail
        }`} />
        <h2 className={`text-sm font-semibold ${
          action === 'dismissed' ? 'text-text-muted' : action === 'triaged' ? 'text-warn' : 'text-fail'
        }`}>{label(assessment)}</h2>
        <span className="text-xs font-mono opacity-70 uppercase">
          {String(assessment.feedback?.value ?? '')}
        </span>
        <div className="ml-auto">
          <ActionButtons action={action} onAction={onAction} />
        </div>
      </div>
      {assessment.rationale && (
        <p className="text-sm text-text-primary leading-relaxed">
          {assessment.rationale}
        </p>
      )}

      {relatedHuman.length > 0 && (
        <div className="mt-4 pt-4 border-t border-current/10">
          <div className="flex items-center gap-2 mb-2">
            <span className={S.sectionLabelHuman}>Human Review</span>
            {relatedHuman.map((h) => (
              <span
                key={h.assessment_id}
                className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  classify(h) === 'pass'
                    ? 'text-pass bg-pass-muted'
                    : classify(h) === 'fail'
                      ? 'text-fail bg-fail-muted'
                      : 'text-warn bg-warn-muted'
                }`}
              >
                {String(h.feedback?.value ?? '—')}
              </span>
            ))}
          </div>
          {relatedHuman.map((h) =>
            h.rationale ? (
              <p key={h.assessment_id} className="text-sm text-text-secondary leading-relaxed">
                {h.rationale}
              </p>
            ) : (
              <p key={h.assessment_id} className="text-xs text-text-muted italic">
                No additional context provided.
              </p>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function FailureRow({
  assessment,
  action,
  onAction,
}: {
  assessment: Assessment
  action: TriageAction | null
  onAction: (a: TriageAction | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`transition ${action === 'dismissed' ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition ${
            action === 'triaged' ? 'bg-warn-muted text-warn' : 'bg-fail-muted text-fail'
          }`}
        >
          <span className={`w-1.5 h-1.5 ${
            action === 'dismissed' ? S.dot.muted : action === 'triaged' ? S.dot.warn : S.dot.fail
          }`} />
          <span className="font-medium">{label(assessment)}</span>
          <span className="ml-auto font-mono opacity-70 uppercase">{String(assessment.feedback?.value ?? '')}</span>
          {assessment.rationale && (
            <svg className={`w-3 h-3 opacity-40 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        <ActionButtons action={action} onAction={onAction} />
      </div>
      {open && assessment.rationale && (
        <p className="mt-1 px-3 py-2 text-xs text-text-secondary bg-surface-overlay rounded-md leading-relaxed">
          {assessment.rationale}
        </p>
      )}
    </div>
  )
}

function HumanRow({ assessment }: { assessment: Assessment }) {
  const verdict = classify(assessment)
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <span className={`shrink-0 mt-0.5 ${
        verdict === 'pass' ? S.badge.pass : verdict === 'fail' ? S.badge.fail : S.badge.warn
      }`}>
        {label(assessment)}
      </span>
      <div className="min-w-0">
        <span className="text-xs font-mono text-text-muted uppercase">
          {String(assessment.feedback?.value ?? '—')}
        </span>
        {assessment.rationale && (
          <p className="text-xs text-text-secondary leading-relaxed mt-1">{assessment.rationale}</p>
        )}
      </div>
    </div>
  )
}
