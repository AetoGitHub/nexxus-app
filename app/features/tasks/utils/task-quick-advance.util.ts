import type { Task } from '~/features/tasks/types/task.types'
import { canModifyTask } from '~/features/tasks/utils/task-access.util'

/** Paso al que el círculo de la tarea la manda con un clic, sin preguntar nada. */
export interface QuickAdvanceStep {
  kind: 'start' | 'review' | 'complete'
  /** Status al que pasa. */
  nextStatus: 'wip' | 'in_review' | 'complete'
  /** Clave i18n del tooltip del círculo. */
  tooltipKey: string
  /** Ícono que aparece dentro del círculo al pasar el cursor. */
  icon: string
}

const STEPS: Record<QuickAdvanceStep['kind'], QuickAdvanceStep> = {
  start: { kind: 'start', nextStatus: 'wip', tooltipKey: 'tasks.quickAdvance.start', icon: 'i-lucide-play' },
  review: { kind: 'review', nextStatus: 'in_review', tooltipKey: 'tasks.quickAdvance.review', icon: 'i-lucide-arrow-right' },
  complete: { kind: 'complete', nextStatus: 'complete', tooltipKey: 'tasks.quickAdvance.complete', icon: 'i-lucide-check' },
}

type QuickAdvanceSource = Pick<Task, 'status' | 'type' | 'multiple_close' | 'archived' | 'backlog' | 'assigned_to' | 'close_approvals'>

function isMine(task: QuickAdvanceSource, userId: number | null | undefined): boolean {
  if (task.archived || task.backlog || userId == null) {
    return false
  }
  return (task.assigned_to ?? []).some(assignee => assignee.id === userId) && canModifyTask(task, userId)
}

function isMultipleClose(task: QuickAdvanceSource): boolean {
  return task.multiple_close === true || task.type === 'multiple_close'
}

/**
 * Siguiente paso del flujo pendiente → en progreso → en revisión → completada, o `null` si el círculo no puede mover
 * la tarea. Mismas reglas que los botones del detalle: solo quien tiene la tarea asignada, nunca archivada ni en
 * backlog, y el cierre múltiple se queda en revisión (lo completan las confirmaciones, no un clic). Las tareas
 * manuales se saltan la revisión: de en progreso pasan directo a completada.
 */
export function resolveQuickAdvance(task: QuickAdvanceSource, userId: number | null | undefined): QuickAdvanceStep | null {
  if (!isMine(task, userId)) {
    return null
  }

  switch (task.status) {
    case 'pending':
      return STEPS.start
    case 'wip':
      return task.type === 'manual' ? STEPS.complete : STEPS.review
    case 'in_review':
      return isMultipleClose(task) ? null : STEPS.complete
    default:
      return null
  }
}

/**
 * Tarea de cierre múltiple en revisión: es suya pero el círculo no puede completarla (la completan las confirmaciones de
 * quienes deben cerrar su parte). El círculo lo avisa en vez de quedarse mudo.
 */
export function isQuickAdvanceBlocked(task: QuickAdvanceSource, userId: number | null | undefined): boolean {
  return isMine(task, userId) && task.status === 'in_review' && isMultipleClose(task)
}
