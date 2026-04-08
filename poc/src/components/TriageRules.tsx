import { useState } from 'react'
import type { TriageRule, TriageEvent } from '../types'
import { DEFAULT_SCORERS, SCORER_LABELS } from '../types'
import { saveRules } from '../triageStorage'
import * as S from '../styles'

interface ScorerMatchInfo {
  scorerName: string
  label: string
  matchCount: number
  excludedCount: number
  sampleInputs: string[]
}

function buildMatchInfo(
  scorer: string,
  allEvents: TriageEvent[],
  matchedEvents: TriageEvent[],
): ScorerMatchInfo {
  const matched = matchedEvents.filter((e) => e.assessment.assessment_name === scorer)
  const excluded = allEvents.filter(
    (e) => e.assessment.assessment_name === scorer && !matchedEvents.includes(e),
  )
  return {
    scorerName: scorer,
    label: SCORER_LABELS[scorer] ?? scorer,
    matchCount: matched.length,
    excludedCount: excluded.length,
    sampleInputs: matched.slice(0, 3).map((e) => e.trace.input),
  }
}

export default function TriageRules({
  agentId,
  rules,
  onChange,
  allFailedEvents,
  matchedEvents,
}: {
  agentId: string
  rules: TriageRule
  onChange: (rules: TriageRule) => void
  allFailedEvents: TriageEvent[]
  matchedEvents: TriageEvent[]
}) {
  const [addingRule, setAddingRule] = useState(false)

  const removeScorer = (scorer: string) => {
    const updated = {
      ...rules,
      watchedScorers: rules.watchedScorers.filter((s) => s !== scorer),
    }
    saveRules(agentId, updated)
    onChange(updated)
  }

  const addScorer = (scorer: string) => {
    const updated = {
      ...rules,
      watchedScorers: [...rules.watchedScorers, scorer],
    }
    saveRules(agentId, updated)
    onChange(updated)
    setAddingRule(false)
  }

  const setThreshold = (val: number) => {
    const updated = { ...rules, severityThreshold: val }
    saveRules(agentId, updated)
    onChange(updated)
  }

  const availableToAdd = DEFAULT_SCORERS.filter(
    (s) => !rules.watchedScorers.includes(s),
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Threshold setting */}
      <div className={`${S.card} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <span className={S.meta}>Severity:</span>
          <span className="text-xs font-medium text-text-primary">
            Surface traces with {rules.severityThreshold}+ failure{rules.severityThreshold !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={rules.severityThreshold <= 1}
              onClick={() => setThreshold(rules.severityThreshold - 1)}
              className="w-6 h-6 rounded border border-border text-text-muted hover:text-text-primary hover:border-accent cursor-pointer transition text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-default"
            >
              −
            </button>
            <span className="text-sm font-semibold text-text-primary w-4 text-center">
              {rules.severityThreshold}
            </span>
            <button
              type="button"
              disabled={rules.severityThreshold >= DEFAULT_SCORERS.length}
              onClick={() => setThreshold(rules.severityThreshold + 1)}
              className="w-6 h-6 rounded border border-border text-text-muted hover:text-text-primary hover:border-accent cursor-pointer transition text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-default"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Rule list */}
      {rules.watchedScorers.map((scorer) => {
        const info = buildMatchInfo(scorer, allFailedEvents, matchedEvents)
        return (
          <RuleCard
            key={scorer}
            info={info}
            onRemove={() => removeScorer(scorer)}
          />
        )
      })}

      {/* Add rule */}
      {availableToAdd.length > 0 && (
        <div>
          {addingRule ? (
            <div className="bg-surface-card border border-accent-border rounded-lg p-3">
              <p className="text-xs font-medium text-text-secondary mb-2">Select a scorer to watch:</p>
              <div className="flex flex-wrap gap-1.5">
                {availableToAdd.map((scorer) => (
                  <button
                    key={scorer}
                    type="button"
                    onClick={() => addScorer(scorer)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-surface-overlay text-text-secondary hover:border-accent hover:text-accent cursor-pointer transition"
                  >
                    + {SCORER_LABELS[scorer] ?? scorer}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAddingRule(false)}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer mt-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingRule(true)}
              className="w-full border border-dashed border-border rounded-lg py-2.5 text-xs text-text-muted hover:text-accent hover:border-accent cursor-pointer transition"
            >
              + Add rule
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function RuleCard({
  info,
  onRemove,
}: {
  info: ScorerMatchInfo
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`${S.card} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`w-2 h-2 ${info.matchCount > 0 ? S.dot.fail : S.dot.pass}`} />
        <span className="text-sm font-medium text-text-primary">{info.label}</span>

        {info.matchCount > 0 ? (
          <span className={S.badge.fail}>
            {info.matchCount} match{info.matchCount !== 1 ? 'es' : ''}
          </span>
        ) : (
          <span className={S.badge.pass}>No failures</span>
        )}

        {info.excludedCount > 0 && (
          <span className={S.metaSmall}>
            {info.excludedCount} excluded by threshold
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {(info.matchCount > 0 || info.excludedCount > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={S.link}
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-text-muted hover:text-fail cursor-pointer transition"
            title="Remove rule"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-surface-overlay/50 border-t border-border-subtle">
          {info.sampleInputs.length > 0 ? (
            <div>
              <p className={`${S.sectionLabel} text-[11px] mb-2`}>Recent matches</p>
              <div className="flex flex-col gap-1.5">
                {info.sampleInputs.map((input, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-1 h-1 ${S.dot.fail}`} />
                    <span className="text-xs text-text-secondary truncate">{input}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">No matching events with current data.</p>
          )}
        </div>
      )}
    </div>
  )
}
