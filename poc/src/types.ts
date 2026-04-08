export interface Agent {
  experimentId: string
  name: string
  traceCount: number
  issueCount: number
  lastActivity: string | null
}

export interface Assessment {
  assessment_id: string
  assessment_name: string
  trace_id: string
  span_id: string
  source: {
    source_type: 'LLM_JUDGE' | 'HUMAN' | 'CODE'
    source_id: string
  }
  create_time: string
  last_update_time: string
  feedback?: {
    value: string | boolean | number
  }
  rationale?: string
  metadata?: Record<string, string>
  valid: boolean
  error?: {
    error_code: string
    error_message: string
  }
}

export interface TraceWithAssessments {
  traceId: string
  experimentId: string
  input: string
  output: string
  timestamp: string
  durationMs: number
  status: string
  tokenUsage: { input_tokens: number; output_tokens: number; total_tokens: number } | null
  cost: { total_cost: number } | null
  assessments: Assessment[]
}

export interface TriageRule {
  watchedScorers: string[]
  severityThreshold: number
}

export const DEFAULT_SCORERS = [
  'relevance_to_query',
  'completeness',
  'fluency',
  'safety',
  'summarization',
  'tool_call_correctness',
  'tool_call_efficiency',
  'Length',
]

export const SCORER_LABELS: Record<string, string> = {
  relevance_to_query: 'Relevance',
  completeness: 'Completeness',
  fluency: 'Fluency',
  safety: 'Safety',
  summarization: 'Summarization',
  tool_call_correctness: 'Tool Correctness',
  tool_call_efficiency: 'Tool Efficiency',
  Length: 'Length',
}

export const DEFAULT_TRIAGE_RULE: TriageRule = {
  watchedScorers: [...DEFAULT_SCORERS],
  severityThreshold: 1,
}

export type TriageAction = 'triaged' | 'dismissed'

export interface TriageEvent {
  assessment: Assessment
  trace: TraceWithAssessments
}
