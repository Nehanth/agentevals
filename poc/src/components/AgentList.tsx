import { useEffect, useState } from 'react'
import type { Agent } from '../types'
import { fetchAgents } from '../api'
import * as S from '../styles'

export default function AgentList({
  onSelect,
}: {
  onSelect: (agent: Agent) => void
}) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className={`h-6 w-6 ${S.spinner}`} />
      </div>
    )
  }

  if (error) {
    return <div className={S.error}>{error}</div>
  }

  if (agents.length === 0) {
    return (
      <p className="text-center py-24 text-text-muted text-sm">
        No agents found. Create an MLflow experiment to get started.
      </p>
    )
  }

  return (
    <div>
      <h2 className={`${S.sectionLabel} mb-3`}>Your Agents</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <button
            key={agent.experimentId}
            type="button"
            onClick={() => onSelect(agent)}
            className={`${S.cardHover} p-4 text-left group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="font-semibold text-text-primary group-hover:text-accent transition text-sm">
                {agent.name}
              </div>
              {agent.issueCount > 0 ? (
                <span className={S.badge.fail}>
                  {agent.issueCount} issue{agent.issueCount !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className={S.badge.pass}>Clear</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>{agent.traceCount} trace{agent.traceCount !== 1 ? 's' : ''}</span>
              {agent.lastActivity && (
                <span>
                  {new Date(agent.lastActivity).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
