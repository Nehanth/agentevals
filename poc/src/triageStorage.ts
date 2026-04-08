import type { TriageRule, TriageAction } from './types'
import { DEFAULT_TRIAGE_RULE } from './types'

const RULES_PREFIX = 'triage-rules-'
const ACTIONS_KEY = 'triage-actions'

export function loadRules(agentId: string): TriageRule {
  try {
    const raw = localStorage.getItem(`${RULES_PREFIX}${agentId}`)
    return raw ? JSON.parse(raw) : { ...DEFAULT_TRIAGE_RULE }
  } catch {
    return { ...DEFAULT_TRIAGE_RULE }
  }
}

export function saveRules(agentId: string, rules: TriageRule) {
  localStorage.setItem(`${RULES_PREFIX}${agentId}`, JSON.stringify(rules))
}

type ActionMap = Record<string, TriageAction>

function loadActionMap(): ActionMap {
  try {
    const raw = localStorage.getItem(ACTIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveActionMap(map: ActionMap) {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(map))
}

export function getAction(assessmentId: string): TriageAction | null {
  return loadActionMap()[assessmentId] ?? null
}

export function setAction(assessmentId: string, action: TriageAction | null) {
  const map = loadActionMap()
  if (action === null) {
    delete map[assessmentId]
  } else {
    map[assessmentId] = action
  }
  saveActionMap(map)
}

export function loadAllActions(): ActionMap {
  return loadActionMap()
}
