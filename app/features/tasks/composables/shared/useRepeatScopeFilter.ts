import type { CalendarDate } from '@internationalized/date'
import { currentWeekRange } from '~/features/tasks/utils/kanban/kanban-complete-filter.util'

export type RepeatScopeMode = 'latest' | 'all' | 'week' | 'range'

export interface RepeatScopeRange {
  start: CalendarDate
  end: CalendarDate
}

/**
 * Qué se ve de las tareas repetitivas en «Pendiente» (Kanban) y en «Próximas» (lista). El backend genera sus ocurrencias con
 * meses de anticipación, así que por defecto se pide `repeats=latest` (una por serie: la próxima por vencer):
 * - `latest`: una por serie (default).
 * - `all`: todas las ocurrencias (`repeats=all`).
 * - `week` / `range`: todas las ocurrencias con fecha límite en esa semana o en el rango elegido (`limit_date_from/_to`).
 *
 * Vive aparte de `TaskListFilters` a propósito: solo debe afectar a esa columna/sección y a su contador, no al resto. Cada
 * sitio tiene su propio estado (`key`) y se limpia al cerrar sesión (ver `useAuth`).
 */
export function useRepeatScopeFilter(key: string) {
  const mode = useState<RepeatScopeMode>(`repeat-scope-mode-${key}`, () => 'latest')
  const range = useState<RepeatScopeRange | null>(`repeat-scope-range-${key}`, () => null)

  const query = computed<Record<string, string>>(() => {
    if (mode.value === 'latest') {
      return { repeats: 'latest' }
    }
    if (mode.value === 'all') {
      return { repeats: 'all' }
    }
    const week = currentWeekRange()
    const from = mode.value === 'range' && range.value ? range.value.start.toString() : week.date_from
    const to = mode.value === 'range' && range.value ? range.value.end.toString() : week.date_to
    return { repeats: 'all', limit_date_from: from, limit_date_to: to }
  })

  return { mode, range, query }
}
