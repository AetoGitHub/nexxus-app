import type { Task, TaskAssignee, TaskCloseApproval } from '~/features/tasks/types/task.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'

const ASSIGNEE_AVATAR_COLORS = [
  '#f59e0b',
  '#28ceab',
  '#4c6ef5',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#db2777',
  '#65a30d',
] as const

/** Dos primeras letras del username (no nombre+apellido). */
export function taskAssigneeInitial(username: string): string {
  const source = username.trim()
  return source ? source.slice(0, 2).toUpperCase() : '?'
}

/**
 * Color del avatar: prioriza group_color del asignado; si no, paleta por id.
 */
export function taskAssigneeColor(assignee: TaskAssignee): string {
  const fromGroup = assignee.group_color?.trim()
  if (fromGroup) {
    return resolveThemeColor(fromGroup)
  }
  return ASSIGNEE_AVATAR_COLORS[Math.abs(assignee.id) % ASSIGNEE_AVATAR_COLORS.length]!
}

type BadgeColor = 'error' | 'warning' | 'neutral' | 'primary' | 'success'

interface TaskTypeMeta {
  labelKey: string
  icon: string
}

interface TaskPriorityMeta {
  labelKey: string
  color: BadgeColor
}

interface TaskStatusMeta {
  labelKey: string
  color: BadgeColor
}

const TYPE_META: Record<string, TaskTypeMeta> = {
  manual: { labelKey: 'tasks.types.manual', icon: 'i-lucide-hand' },
  trigger: { labelKey: 'tasks.types.trigger', icon: 'i-lucide-zap' },
  repeat: { labelKey: 'tasks.types.repeat', icon: 'i-lucide-repeat' },
  volume: { labelKey: 'tasks.types.volume', icon: 'i-lucide-layers' },
  multiple_close: { labelKey: 'tasks.types.multiple_close', icon: 'i-lucide-check-check' },
  puesto: { labelKey: 'tasks.types.puesto', icon: 'i-lucide-briefcase' },
  bug: { labelKey: 'tasks.types.bug', icon: 'i-lucide-bug' },
}

const PRIORITY_META: Record<string, TaskPriorityMeta> = {
  urgent: { labelKey: 'tasks.priorities.urgent', color: 'error' },
  critical: { labelKey: 'tasks.priorities.critical', color: 'warning' },
  high: { labelKey: 'tasks.priorities.high', color: 'warning' },
}

const PRIORITY_BAR_COLOR: Record<string, string> = {
  urgent: '#dc2626',
  critical: '#f97316',
  high: '#f59e0b',
  normal: '#28ceab',
  low: '#64748b',
}

export function taskTypeMeta(type: string): TaskTypeMeta {
  return TYPE_META[type] ?? { labelKey: 'tasks.types.unknown', icon: 'i-lucide-tag' }
}

/** Devuelve la meta de prioridad, o `null` cuando no debe mostrarse chip (normal). */
export function taskPriorityMeta(priority: string): TaskPriorityMeta | null {
  return PRIORITY_META[priority] ?? null
}

const STATUS_META: Record<string, TaskStatusMeta> = {
  pending: { labelKey: 'tasks.kanban.columns.pending', color: 'neutral' },
  wip: { labelKey: 'tasks.kanban.columns.wip', color: 'primary' },
  in_review: { labelKey: 'tasks.kanban.columns.inReview', color: 'warning' },
  rejected: { labelKey: 'tasks.kanban.columns.rejected', color: 'error' },
  complete: { labelKey: 'tasks.kanban.columns.complete', color: 'success' },
}

/** Meta de status alineada a columnas Kanban All. */
export function taskStatusMeta(status: string): TaskStatusMeta {
  return STATUS_META[status] ?? { labelKey: 'tasks.status.unknown', color: 'neutral' }
}

export function taskBarColor(task: Task): string {
  if (task.project_color?.trim()) {
    return resolveThemeColor(task.project_color)
  }
  return PRIORITY_BAR_COLOR[task.priority] ?? '#28ceab'
}

/** Requiere atención cuando hay aprobaciones de cierre pendientes. */
export function taskRequiresAttention(task: Task): boolean {
  return task.close_approvals.some(approval => !approval.closed)
}

/** Progreso de close_approvals: closed / total (null si no hay registros). */
export function taskCloseApprovalsProgress(
  approvals: TaskCloseApproval[] | undefined,
): { closed: number, total: number } | null {
  if (!approvals?.length) {
    return null
  }
  return {
    closed: approvals.filter(approval => approval.closed).length,
    total: approvals.length,
  }
}
