import { useEffect, useState, useCallback } from 'react'
import type { Agent, TraceWithAssessments, Assessment, TriageRule, TriageEvent, TriageAction } from '../types'
import { SCORER_LABELS } from '../types'
import { fetchTraces } from '../api'
import TriageRules from './TriageRules'
import { loadRules, loadAllActions, setAction as persistAction } from '../triageStorage'
import * as S from '../styles'

function isFail(a: Assessment): boolean {
  const v = String(a.feedback?.value ?? '').toLowerCase()
  return v === 'no' || v === 'false'
}

export interface ScorerGroup {
  scorerName: string
  label: string
  events: TriageEvent[]
  latestTime: string
}

function buildAllFailedEvents(traces: TraceWithAssessments[]): TriageEvent[] {
  const events: TriageEvent[] = []
  for (const trace of traces) {
    for (const assessment of trace.assessments) {
      if (isFail(assessment)) {
        events.push({ assessment, trace })
      }
    }
  }
  return events
}

function buildGroups(
  traces: TraceWithAssessments[],
  rules: TriageRule,
): ScorerGroup[] {
  const map = new Map<string, TriageEvent[]>()

  for (const trace of traces) {
    const failedWatched = trace.assessments.filter(
      (a) => rules.watchedScorers.includes(a.assessment_name) && isFail(a),
    )
    if (failedWatched.length >= rules.severityThreshold) {
      for (const assessment of failedWatched) {
        const key = assessment.assessment_name
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push({ assessment, trace })
      }
    }
  }

  const groups: ScorerGroup[] = []
  for (const [scorerName, events] of map) {
    events.sort(
      (a, b) =>
        new Date(b.assessment.create_time).getTime() -
        new Date(a.assessment.create_time).getTime(),
    )
    groups.push({
      scorerName,
      label: SCORER_LABELS[scorerName] ?? scorerName,
      events,
      latestTime: events[0].assessment.create_time,
    })
  }

  groups.sort((a, b) => b.events.length - a.events.length)
  return groups
}

type Tab = 'inbox' | 'queue' | 'done'

export default function TriageFeed({
  agent,
  onSelectGroup,
}: {
  agent: Agent
  onSelectGroup: (group: ScorerGroup, traces: TraceWithAssessments[]) => void
}) {
  const [traces, setTraces] = useState<TraceWithAssessments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rules, setRules] = useState<TriageRule>(() => loadRules(agent.experimentId))
  const [tab, setTab] = useState<Tab>('inbox')
  const [actions, setActions] = useState<Record<string, TriageAction>>(loadAllActions)
  const [rulesOpen, setRulesOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchTraces(agent.experimentId)
      .then(setTraces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [agent.experimentId])

  useEffect(() => { load() }, [load])

  const allGroups = buildGroups(traces, rules)

  const pendingCount = (g: ScorerGroup) =>
    g.events.filter((ev) => !actions[ev.assessment.assessment_id]).length

  const groups = allGroups.filter((g) => pendingCount(g) > 0)
  const totalFindings = groups.reduce((sum, g) => sum + pendingCount(g), 0)

  const allFailedEvents = buildAllFailedEvents(traces)
  const matchedEvents = groups.flatMap((g) => g.events)
  const dismissedCount = Object.values(actions).filter((a) => a === 'dismissed').length

  const allEvents = allGroups.flatMap((g) => g.events)
  const triagedEvents = allEvents.filter((ev) => actions[ev.assessment.assessment_id] === 'triaged')
  const queueCount = triagedEvents.length
  const doneEvents = allEvents.filter((ev) => actions[ev.assessment.assessment_id] === 'dismissed')
  const doneCount = doneEvents.length

  const handleAction = (assessmentId: string, action: TriageAction | null) => {
    persistAction(assessmentId, action)
    setActions(loadAllActions())
  }

  const TABS: { id: Tab; label: string; badge?: number; badgeStyle?: string }[] = [
    { id: 'inbox', label: 'Inbox', badge: totalFindings, badgeStyle: S.badge.fail },
    { id: 'queue', label: 'Triage Queue', badge: queueCount, badgeStyle: S.badge.warn },
    { id: 'done', label: 'Done', badge: doneCount, badgeStyle: S.badge.pass },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer transition ${
              tab === t.id
                ? 'text-accent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.badgeStyle}`}>
                {t.badge}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className={S.meta}>
            {traces.length} trace{traces.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs text-text-muted hover:text-accent cursor-pointer transition"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setRulesOpen(!rulesOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition ${
              rulesOpen
                ? 'bg-accent-muted text-accent border-accent-border'
                : 'bg-surface-card text-text-secondary border-border hover:border-accent/30'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters
            <span className="text-[10px] text-text-muted font-normal">
              ({rules.watchedScorers.length})
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className={`h-6 w-6 ${S.spinner}`} />
        </div>
      )}

      {error && <div className={S.error}>{error}</div>}

      {/* Inbox tab */}
      {!loading && !error && tab === 'inbox' && (
        <>
          {/* Inline rules panel */}
          {rulesOpen && (
            <TriageRules
              agentId={agent.experimentId}
              rules={rules}
              onChange={setRules}
              allFailedEvents={allFailedEvents}
              matchedEvents={matchedEvents}
            />
          )}

          {/* Grouped failure cards */}
          <div className="flex flex-col gap-2">
            {groups.length === 0 ? (
              <p className="text-center py-16 text-text-muted text-sm">
                No findings match your rules.
              </p>
            ) : (
              groups.map((group) => {
                const pending = group.events.filter((ev) => !actions[ev.assessment.assessment_id])
                const latest = new Date(group.latestTime)
                const rationales = pending
                  .map((e) => e.assessment.rationale ?? '')
                  .filter(Boolean)
                const topRationale = rationales[0] ?? ''
                const preview = topRationale.length > 120 ? topRationale.slice(0, 120) + '...' : topRationale

                return (
                  <button
                    key={group.scorerName}
                    type="button"
                    onClick={() => onSelectGroup(group, traces)}
                    className={`w-full ${S.cardHover} p-4 text-left group`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-2 h-2 ${S.dot.fail}`} />
                      <span className="text-sm font-semibold text-text-primary">{group.label}</span>
                      <span className={S.badge.fail}>
                        {pending.length} occurrence{pending.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`${S.metaSmall} ml-auto`}>
                        Latest: {latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                        {latest.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {preview && (
                      <p className="text-xs text-text-secondary leading-relaxed mb-2">{preview}</p>
                    )}

                    <div className={`flex items-center gap-2 ${S.metaSmall} pt-2 border-t border-border-subtle`}>
                      <span>
                        Affects {pending.length} of {traces.length} traces
                      </span>
                      <span className="ml-auto shrink-0 group-hover:text-accent transition">
                        View occurrences &rarr;
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Triage Queue tab */}
      {!loading && !error && tab === 'queue' && (
        <QueueTab events={triagedEvents} onAction={handleAction} />
      )}

      {/* Done tab */}
      {!loading && !error && tab === 'done' && (
        <DoneTab events={doneEvents} onAction={handleAction} />
      )}
    </div>
  )
}

interface QueueGroup {
  scorerName: string
  label: string
  events: TriageEvent[]
}

function buildQueueGroups(events: TriageEvent[]): QueueGroup[] {
  const map = new Map<string, TriageEvent[]>()
  for (const ev of events) {
    const key = ev.assessment.assessment_name
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }
  const groups: QueueGroup[] = []
  for (const [scorerName, evs] of map) {
    groups.push({
      scorerName,
      label: SCORER_LABELS[scorerName] ?? scorerName,
      events: evs,
    })
  }
  groups.sort((a, b) => b.events.length - a.events.length)
  return groups
}

function QueueTab({
  events,
  onAction,
}: {
  events: TriageEvent[]
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted text-sm mb-1">No items in the triage queue.</p>
        <p className="text-text-muted text-xs">Mark issues as "Triage" from the scorer occurrences to add them here.</p>
      </div>
    )
  }

  const groups = buildQueueGroups(events)

  return (
    <>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <QueueGroupSection key={group.scorerName} group={group} onAction={onAction} />
        ))}
      </div>
    </>
  )
}

function QueueGroupSection({
  group,
  onAction,
}: {
  group: QueueGroup
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  return (
    <div className="bg-surface-card border border-warn-border/60 rounded-lg overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className={`w-2 h-2 ${S.dot.warn}`} />
        <h3 className={S.sectionLabelWarn}>{group.label}</h3>
        <span className={S.badge.warn}>{group.events.length}</span>
        <button
          type="button"
          className={`ml-auto inline-flex items-center gap-1.5 ${S.btnAccent}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Fix with agent
        </button>
      </div>

      <div>
        {group.events.map((ev) => (
          <QueueEventRow key={ev.assessment.assessment_id} event={ev} onAction={onAction} />
        ))}
      </div>
    </div>
  )
}

function QueueEventRow({
  event,
  onAction,
}: {
  event: TriageEvent
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { assessment, trace } = event
  const date = new Date(assessment.create_time)
  const rationale = assessment.rationale ?? ''

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-3 pl-8 pr-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
        >
          <svg
            className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-text-primary truncate group-hover:text-accent transition">
            {trace.input}
          </span>
        </button>

        <span className={`${S.metaSmall} shrink-0`}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>

        <button
          type="button"
          onClick={() => onAction(assessment.assessment_id, 'dismissed')}
          className={S.btnGhost}
        >
          Dismiss
        </button>
      </div>

      {expanded && (
        <div className="pl-14 pr-4 pb-3">
          {rationale && (
            <p className="text-xs text-text-secondary leading-relaxed mb-2">{rationale}</p>
          )}
          <span className={S.mono}>{trace.traceId}</span>
        </div>
      )}
    </div>
  )
}

function DoneTab({
  events,
  onAction,
}: {
  events: TriageEvent[]
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted text-sm mb-1">Nothing here yet.</p>
        <p className="text-text-muted text-xs">Dismissed and resolved items will appear here.</p>
      </div>
    )
  }

  const groups = buildQueueGroups(events)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <DoneGroupSection key={group.scorerName} group={group} onAction={onAction} />
      ))}
    </div>
  )
}

function DoneGroupSection({
  group,
  onAction,
}: {
  group: QueueGroup
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  return (
    <div className="bg-surface-card border border-border rounded-lg overflow-hidden opacity-70">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className={`w-2 h-2 ${S.dot.pass}`} />
        <h3 className={S.sectionLabel}>{group.label}</h3>
        <span className={S.badge.muted}>{group.events.length}</span>
      </div>

      <div>
        {group.events.map((ev) => (
          <DoneEventRow key={ev.assessment.assessment_id} event={ev} onAction={onAction} />
        ))}
      </div>
    </div>
  )
}

function DoneEventRow({
  event,
  onAction,
}: {
  event: TriageEvent
  onAction: (assessmentId: string, action: TriageAction | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { assessment, trace } = event
  const date = new Date(assessment.create_time)
  const rationale = assessment.rationale ?? ''

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-3 pl-8 pr-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
        >
          <svg
            className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-text-muted truncate group-hover:text-text-secondary transition line-through">
            {trace.input}
          </span>
        </button>

        <span className={`${S.metaSmall} shrink-0`}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>

        <button
          type="button"
          onClick={() => onAction(assessment.assessment_id, null)}
          className={S.btnGhost}
        >
          Restore
        </button>
      </div>

      {expanded && (
        <div className="pl-14 pr-4 pb-3">
          {rationale && (
            <p className="text-xs text-text-secondary leading-relaxed mb-2">{rationale}</p>
          )}
          <span className={S.mono}>{trace.traceId}</span>
        </div>
      )}
    </div>
  )
}
