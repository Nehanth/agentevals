import type { Agent, TraceWithAssessments, Assessment } from './types'

function parseMetadataValue(metadata: { key: string; value: string }[], key: string): string {
  return metadata.find((m) => m.key === key)?.value ?? ''
}

function tryParseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) } catch { return null }
}

function stripQuotes(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1)
  return s
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch('/api/ajax-api/2.0/mlflow/experiments/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_results: 100 }),
  })
  const data = await res.json()
  const experiments: { experiment_id: string; name: string; last_update_time: number; creation_time: number }[] =
    data.experiments ?? []

  const agents: Agent[] = await Promise.all(
    experiments
      .filter((e) => e.name !== 'Default')
      .map(async (exp) => {
        const traceRes = await fetch(`/api/ajax-api/2.0/mlflow/traces?experiment_ids=${exp.experiment_id}`)
        const traceData = await traceRes.json()
        const traces = traceData.traces ?? []

        let issueCount = 0
        let latestTs: number | null = null

        for (const t of traces) {
          if (!latestTs || t.timestamp_ms > latestTs) latestTs = t.timestamp_ms
          const detail = await fetch(`/api/ajax-api/3.0/mlflow/traces/${t.request_id}`)
          const detailData = await detail.json()
          const assessments: Assessment[] = detailData.trace?.trace_info?.assessments ?? []
          const hasFail = assessments.some((a) => {
            if (!a.valid) return false
            const v = String(a.feedback?.value ?? '').toLowerCase()
            return v === 'no' || v === 'false'
          })
          if (hasFail) issueCount++
        }

        return {
          experimentId: exp.experiment_id,
          name: exp.name,
          traceCount: traces.length,
          issueCount,
          lastActivity: latestTs ? new Date(latestTs).toISOString() : null,
        }
      }),
  )

  return agents
}

export async function fetchTraces(experimentId: string): Promise<TraceWithAssessments[]> {
  const listRes = await fetch(`/api/ajax-api/2.0/mlflow/traces?experiment_ids=${experimentId}`)
  const listData = await listRes.json()
  const traces: {
    request_id: string
    timestamp_ms: number
    execution_time_ms: number
    status: string
    request_metadata: { key: string; value: string }[]
  }[] = listData.traces ?? []

  const results = await Promise.all(
    traces.map(async (t): Promise<TraceWithAssessments> => {
      const detailRes = await fetch(`/api/ajax-api/3.0/mlflow/traces/${t.request_id}`)
      const detailData = await detailRes.json()
      const info = detailData.trace?.trace_info

      return {
        traceId: t.request_id,
        experimentId,
        input: stripQuotes(parseMetadataValue(t.request_metadata, 'mlflow.traceInputs')),
        output: stripQuotes(parseMetadataValue(t.request_metadata, 'mlflow.traceOutputs')),
        timestamp: new Date(t.timestamp_ms).toISOString(),
        durationMs: t.execution_time_ms,
        status: t.status,
        tokenUsage: tryParseJson(parseMetadataValue(t.request_metadata, 'mlflow.trace.tokenUsage')),
        cost: tryParseJson(parseMetadataValue(t.request_metadata, 'mlflow.trace.cost')),
        assessments: (info?.assessments ?? []).filter((a: Assessment) => a.valid),
      }
    }),
  )

  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
