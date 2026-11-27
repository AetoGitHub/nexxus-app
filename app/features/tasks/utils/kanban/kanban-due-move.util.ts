import type { OverdueColumnId } from '~/features/tasks/types/task.types'
import { dateInputToLimitDay } from '~/features/tasks/utils/form/task-form.util'

/** Destino de movimiento resuelto desde un drop en Kanban Due. */
export type KanbanDueMove =
  | { kind: 'confirm', columnId: 'today' | 'tomorrow', limitDateInput: string }
  | { kind: 'pick_date', columnId: 'week' | 'month', minDate: string, maxDate: string }
  | { kind: 'blocked', reason: 'no_date' | 'others' }

const OVERDUE_COLUMNS = new Set<string>([
  'today',
  'tomorrow',
  'week',
  'month',
  'others',
  'no_date',
])

function isOverdueColumnId(id: string | number): id is OverdueColumnId {
  return typeof id === 'string' && OVERDUE_COLUMNS.has(id)
}

/** Formatea una fecha local como YYYY-MM-DD. */
export function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  // Otras fechas junta vencidas y meses siguientes: no hay una fecha que deducir del drop.
  if (toColumnId === 'others') {
    return { kind: 'blocked', reason: 'others' }
  }

  // "Hoy" es el día en CDMX (donde vence la tarea), no el del navegador.
  const today = businessToday(now)

  if (toColumnId === 'today') {
    return {
      kind: 'confirm',
      columnId: 'today',
      limitDateInput: today,
    }
  }

  if (toColumnId === 'tomorrow') {
    return {
      kind: 'confirm',
      columnId: 'tomorrow',
      limitDateInput: addDaysToDayKey(today, 1),
    }
  }

  const minDate = addDaysToDayKey(today, 1)

  if (toColumnId === 'week') {
    return {
      kind: 'pick_date',
      columnId: 'week',
      minDate,
      maxDate: addDaysToDayKey(today, 7),
    }
  }

  return {
    kind: 'pick_date',
    columnId: 'month',
    minDate,
    maxDate: addDaysToDayKey(today, 30),
  }
}

/** YYYY-MM-DD que espera PATCH limit_date (el backend lo vence a las 23:59:59 de CDMX). */
export function dueDateInputToLimitDay(dateInput: string): string {
  return dateInputToLimitDay(dateInput)
}
