export const card = 'bg-surface-card border border-border rounded-lg'
export const cardHover = `${card} cursor-pointer hover:border-accent/40 transition`

export const badge = {
  fail: 'text-xs font-medium text-fail bg-fail-muted px-2 py-0.5 rounded-full',
  pass: 'text-xs font-medium text-pass bg-pass-muted px-2 py-0.5 rounded-full',
  warn: 'text-xs font-medium text-warn bg-warn-muted px-2 py-0.5 rounded-full',
  muted: 'text-xs font-medium text-text-muted bg-surface-overlay px-2 py-0.5 rounded-full',
  accent: 'text-xs font-medium text-accent bg-accent-muted px-2 py-0.5 rounded-full',
}

export const sectionLabel = 'text-xs font-semibold text-text-muted uppercase tracking-wide'
export const sectionLabelFail = 'text-xs font-semibold text-fail uppercase tracking-wide'
export const sectionLabelWarn = 'text-xs font-semibold text-warn uppercase tracking-wide'
export const sectionLabelHuman = 'text-xs font-semibold text-human uppercase tracking-wide'

export const meta = 'text-xs text-text-muted'
export const metaSmall = 'text-[11px] text-text-muted'
export const mono = 'text-[11px] font-mono text-text-muted'

export const btnGhost = 'text-xs px-2.5 py-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-overlay cursor-pointer transition font-medium'
export const btnAccent = 'text-xs px-2.5 py-1 rounded-md text-accent bg-accent-muted hover:bg-accent hover:text-white cursor-pointer transition font-medium'
export const btnWarn = 'text-xs px-2.5 py-1 rounded-md text-warn bg-warn-muted hover:bg-warn hover:text-white cursor-pointer transition font-medium'
export const btnPill = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition'

export const link = 'text-xs text-accent hover:underline cursor-pointer font-medium'

export const dot = {
  fail: 'rounded-full bg-fail shrink-0',
  pass: 'rounded-full bg-pass shrink-0',
  warn: 'rounded-full bg-warn shrink-0',
  muted: 'rounded-full bg-text-muted shrink-0',
}

export const spinner = 'animate-spin rounded-full border-2 border-accent border-t-transparent'
export const error = 'bg-fail-muted border border-fail-border rounded-lg p-3 text-fail text-sm'
