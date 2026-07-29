import type { OverdueColumnId } from '~/features/tasks/types/task.types'
import { dateInputToLimitISO } from '~/features/tasks/utils/form/task-form.util'

/** Destino de movimiento resuelto desde un drop en Kanban Due. */
export type KanbanDueMove =
  | { kind: 'confirm', columnId: 'today' | 'tomorrow', limitDateInput: string }
  | { kind: 'pick_date', columnId: 'week' | 'month', minDate: string, maxDate: string }
  | { kind: 'blocked', reason: 'no_date' }

const OVERDUE_COLUMNS = new Set<string>([
  'today',
  'tomorrow',
  'week',
  'month',
  'no_date',
])

function isOverdueColumnId(id: string | number): id is OverdueColumnId {
  return typeof id === 'string' && OVERDUE_COLUMNS.has(id)
}

/** Hoy local a medianoche (sin hora) para sumar días sin desfase UTC. */
function startOfTodayLocal(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Formatea una fecha local como YYYY-MM-DD. */
export function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  next.setDate(next.getDate() + days)
  return next
}

/**
 * Resuelve el flujo de UI al soltar una tarea en una columna de vencimiento.
 * - tomorrow/today → confirmación con fecha fija
 * - week → picker mañana…hoy+7
 * - month → picker mañana…hoy+30
 * - no_date → bloqueado
 */
export function resolveKanbanDueMove(
  fromColumnId: string | number,
  toColumnId: string | number,
  now = new Date(),
): KanbanDueMove | null {
  if (!isOverdueColumnId(toColumnId)) {
    return null
  }
  if (fromColumnId === toColumnId) {
    return null
  }

  if (toColumnId === 'no_date') {
    return { kind: 'blocked', reason: 'no_date' }
  }

  const today = startOfTodayLocal(now)

  if (toColumnId === 'today') {
    return {
      kind: 'confirm',
      columnId: 'today',
      limitDateInput: toDateInput(today),
    }
  }

  if (toColumnId === 'tomorrow') {
    return {
      kind: 'confirm',
      columnId: 'tomorrow',
      limitDateInput: toDateInput(addDays(today, 1)),
    }
  }

  const minDate = toDateInput(addDays(today, 1))

  if (toColumnId === 'week') {
    return {
      kind: 'pick_date',
      columnId: 'week',
      minDate,
      maxDate: toDateInput(addDays(today, 7)),
    }
  }

  return {
    kind: 'pick_date',
    columnId: 'month',
    minDate,
    maxDate: toDateInput(addDays(today, 30)),
  }
}

/** Convierte YYYY-MM-DD al ISO que espera PATCH limit_date. */
export function dueDateInputToLimitISO(dateInput: string): string {
  return dateInputToLimitISO(dateInput)
}
