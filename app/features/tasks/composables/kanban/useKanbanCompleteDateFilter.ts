import type { CalendarDate } from '@internationalized/date'
import { currentWeekRange } from '~/features/tasks/utils/kanban/kanban-complete-filter.util'

export type KanbanCompleteFilterMode = 'week' | 'range' | 'all'

export interface KanbanCompleteDateRange {
  start: CalendarDate
  end: CalendarDate
}

/**
 * Estado del filtro de fecha de la columna Completado: semana actual (default),
 * rango elegido por el usuario, o todas (sin filtro). Vive separado de
 * `TaskListFilters` a propósito — solo debe afectar la lista y el conteo de
 * `complete`, nunca al resto de las columnas del Kanban.
 */
export function useKanbanCompleteDateFilter() {
  const mode = ref<KanbanCompleteFilterMode>('week')
  const range = ref<KanbanCompleteDateRange | null>(null)

  const query = computed<{ date_from: string, date_to: string } | undefined>(() => {
    if (mode.value === 'all') {
      return undefined
    }
    if (mode.value === 'range' && range.value) {
      return {
        date_from: range.value.start.toString(),
        date_to: range.value.end.toString(),
      }
    }
    return currentWeekRange()
  })

  return { mode, range, query }
}
