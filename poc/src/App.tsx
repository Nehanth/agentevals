import { useState } from 'react'
import type { Agent, TraceWithAssessments } from './types'
import type { ScorerGroup } from './components/TriageFeed'
import AgentList from './components/AgentList'
import TriageFeed from './components/TriageFeed'
import ScorerOccurrences from './components/ScorerOccurrences'
import DrillDown from './components/DrillDown'
import './index.css'

type View =
  | { kind: 'agents' }
  | { kind: 'feed'; agent: Agent }
  | { kind: 'scorer'; agent: Agent; group: ScorerGroup }
  | { kind: 'detail'; agent: Agent; group: ScorerGroup; trace: TraceWithAssessments; focusAssessmentId?: string }

function getBackTarget(view: View): { label: string; target: View } | null {
  if (view.kind === 'feed') {
    return { label: 'Agents', target: { kind: 'agents' } }
  }
  if (view.kind === 'scorer') {
    return { label: view.agent.name, target: { kind: 'feed', agent: view.agent } }
  }
  if (view.kind === 'detail') {
    return {
      label: view.group.label,
      target: { kind: 'scorer', agent: view.agent, group: view.group },
    }
  }
  return null
}

export default function App() {
  const [view, setView] = useState<View>({ kind: 'agents' })

  const back = getBackTarget(view)

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface-raised border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-3">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <button
            type="button"
            onClick={() => setView({ kind: 'agents' })}
            className="text-text-primary text-lg font-bold tracking-tight cursor-pointer hover:text-accent transition"
          >
            Agent Triage
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-5">
        {back && (
          <button
            type="button"
            onClick={() => setView(back.target)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-accent cursor-pointer transition mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {back.label}
          </button>
        )}

        {view.kind === 'agents' && (
          <AgentList onSelect={(agent) => setView({ kind: 'feed', agent })} />
        )}

        {view.kind === 'feed' && (
          <TriageFeed
            agent={view.agent}
            onSelectGroup={(group) =>
              setView({ kind: 'scorer', agent: view.agent, group })
            }
          />
        )}

        {view.kind === 'scorer' && (
          <ScorerOccurrences
            agent={view.agent}
            group={view.group}
            onSelectTrace={(trace, focusAssessmentId) =>
              setView({ kind: 'detail', agent: view.agent, group: view.group, trace, focusAssessmentId })
            }
          />
        )}

        {view.kind === 'detail' && (
          <DrillDown
            agent={view.agent}
            trace={view.trace}
            focusAssessmentId={view.focusAssessmentId}
          />
        )}
      </main>
    </div>
  )
}
