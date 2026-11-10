import type { TaskHistoryChange, TaskHistoryEvent } from '~/features/tasks/types/task.types'

/** Sección del historial: un evento `process` (cambio de fase) y lo que pasó después hasta el siguiente. */
export interface TaskHistoryPhase {
  /** null = fase inicial (lo que pasó antes del primer `process`). */
  process: TaskHistoryEvent | null
  events: TaskHistoryEvent[]
}

/** Agrupa el timeline por fase respetando el orden del backend (no se reordena). */
export function groupTimelineByPhase(timeline: TaskHistoryEvent[]): TaskHistoryPhase[] {
  const phases: TaskHistoryPhase[] = []
  let current: TaskHistoryPhase = { process: null, events: [] }

  for (const event of timeline) {
    if (event.type === 'process') {
      if (current.process || current.events.length) {
        phases.push(current)
      }
      current = { process: event, events: [] }
      continue
    }
    current.events.push(event)
  }
  if (current.process || current.events.length) {
    phases.push(current)
  }
  return phases
}

/** Nombre del actor: nombre y apellido, si no el username; null cuando es el sistema. */
export function historyActorName(event: TaskHistoryEvent): string | null {
  if (event.actor == null) {
    return null
  }
  const full = [event.actor_first_name, event.actor_last_name].filter(Boolean).join(' ').trim()
  return full || event.actor_username?.trim() || null
}

const EVENT_ICONS: Record<string, string> = {
  message: 'i-lucide-message-square',
  message_edited: 'i-lucide-pencil',
  message_deleted: 'i-lucide-trash-2',
  process: 'i-lucide-flag',
  process_edited: 'i-lucide-message-square-quote',
  archive_edited: 'i-lucide-message-square-quote',
  task_updated: 'i-lucide-square-pen',
  close_approval_assigned: 'i-lucide-user-check',
  close_approval_resolved: 'i-lucide-check-check',
  archive: 'i-lucide-archive',
  token: 'i-lucide-pointer',
  mention: 'i-lucide-at-sign',
  file: 'i-lucide-paperclip',
  subtask_created: 'i-lucide-list-plus',
  subtask_deleted: 'i-lucide-list-x',
  subtask_completed: 'i-lucide-list-checks',
  subtask_uncompleted: 'i-lucide-list-restart',
  subtask_updated: 'i-lucide-list-todo',
}

/** Ícono por tipo de evento; genérico para tipos que no conocemos. */
export function historyEventIcon(type: string): string {
  return EVENT_ICONS[type] ?? 'i-lucide-circle-dot'
}

export type HistoryTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary' | 'neutral'

const EVENT_TONES: Record<string, HistoryTone> = {
  message: 'info',
  message_edited: 'info',
  message_deleted: 'error',
  process_edited: 'info',
  archive_edited: 'info',
  task_updated: 'primary',
  close_approval_assigned: 'success',
  close_approval_resolved: 'success',
  archive: 'error',
  token: 'warning',
  mention: 'warning',
  file: 'neutral',
  subtask_created: 'secondary',
  subtask_deleted: 'secondary',
  subtask_completed: 'secondary',
  subtask_uncompleted: 'secondary',
  subtask_updated: 'secondary',
}

/** Color del punto del timeline por tipo de evento. */
export function historyEventTone(event: TaskHistoryEvent): HistoryTone {
  if (event.type === 'close_approval_resolved' && event.detail?.cancelled) {
    return 'error'
  }
  return EVENT_TONES[event.type] ?? 'neutral'
}

/** Clases (estáticas para Tailwind) de cada tono. */
export const HISTORY_TONE_CLASSES: Record<HistoryTone, { dot: string, accent: string, soft: string }> = {
  primary: { dot: 'bg-primary/15 text-primary ring-primary/30', accent: 'bg-primary', soft: 'bg-primary/5' },
  info: { dot: 'bg-info/15 text-info ring-info/30', accent: 'bg-info', soft: 'bg-info/5' },
  success: { dot: 'bg-success/15 text-success ring-success/30', accent: 'bg-success', soft: 'bg-success/5' },
  warning: { dot: 'bg-warning/15 text-warning ring-warning/30', accent: 'bg-warning', soft: 'bg-warning/5' },
  error: { dot: 'bg-error/15 text-error ring-error/30', accent: 'bg-error', soft: 'bg-error/5' },
  secondary: { dot: 'bg-secondary/15 text-secondary ring-secondary/30', accent: 'bg-secondary', soft: 'bg-secondary/5' },
  neutral: { dot: 'bg-muted text-muted-foreground ring-border', accent: 'bg-muted-foreground/50', soft: 'bg-muted/40' },
}

/** Ícono del encabezado de una fase según su estatus. */
export function historyPhaseIcon(status: string): string {
  return ({
    backlog: 'i-lucide-inbox',
    pending: 'i-lucide-circle-dashed',
    wip: 'i-lucide-loader-circle',
    in_review: 'i-lucide-eye',
    complete: 'i-lucide-circle-check-big',
    rejected: 'i-lucide-circle-x',
    reopened: 'i-lucide-rotate-ccw',
  } as Record<string, string>)[status] ?? 'i-lucide-flag'
}

/** Lee `detail.changes` de forma segura. */
export function historyChanges(event: TaskHistoryEvent): TaskHistoryChange[] {
  const changes = event.detail?.changes
  return Array.isArray(changes) ? changes as TaskHistoryChange[] : []
}

/** Lee un string de `detail`; '' si no viene o no es texto. */
export function historyDetailString(event: TaskHistoryEvent, key: string): string {
  const value = event.detail?.[key]
  return typeof value === 'string' ? value : ''
}

/** `detail.comment` de `process_edited` / `archive_edited`: `{ old, new }`; null si no cambió el comentario. */
export function historyCommentChange(event: TaskHistoryEvent): { old: string, new: string } | null {
  const value = event.detail?.comment
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const change = value as { old?: unknown, new?: unknown }
  return {
    old: typeof change.old === 'string' ? change.old : '',
    new: typeof change.new === 'string' ? change.new : '',
  }
}

/** Lee un número de `detail` (p. ej. `process`); null si no viene. */
export function historyDetailNumber(event: TaskHistoryEvent, key: string): number | null {
  const value = event.detail?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Lee una lista de URLs de `detail`. */
export function historyDetailUrls(event: TaskHistoryEvent, key: string): string[] {
  const value = event.detail?.[key]
  return Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string' && url.length > 0) : []
}

/** Valor de un cambio listo para mostrar; null/'' → null (la UI pone «—»). */
export function historyValueText(value: unknown): string | null {
  if (value == null || value === '') {
    return null
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(item => historyValueText(item) ?? '—').join(', ') : null
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
