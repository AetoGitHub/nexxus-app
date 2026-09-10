import type { Task } from '~/features/tasks/types/task.types'

/** Secciones compartidas entre lista y kanban de Por actualizar. */
export type ToUpdateSectionId =
  | 'unattended'
  | 'pending'
  | 'urgent'
  | 'delayed'
  | 'critical'
  | 'accepted'

export interface ToUpdateSection {
  id: ToUpdateSectionId
  labelKey: string
  color: string
  count?: number
  tasks: Task[]
  loading: boolean
  error: boolean
  /** Estado inicial del collapsible en lista. */
  defaultOpen?: boolean
  /** Columna Kanban colapsada como pestaña angosta (ej. Sin atender). */
  collapsible?: boolean
}

/** Contadores de GET /api/tasks/company/:id/close/counts/ */
export interface ToUpdateCounts {
  unattended: number
  pending: number
  urgent: number
  delayed: number
  critical: number
  accepted: number
}
