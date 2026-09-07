import { useQueryClient } from '@tanstack/vue-query'
import type {
  CalendarMonth,
  Task,
  TaskCalendarPhase,
} from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { calendarVisibleRange } from '~/features/tasks/utils/calendar/task-calendar.util'

const RANGE_QUERY_KEYS = new Set(['year', 'month', 'date_from', 'date_to'])

/**
 * Refresca el único endpoint del calendario activo y reemplaza su caché.
 * Inicio y proceso comparten endpoint; cierre usa `closing-date`.
 */
export function useCalendarRealtimeTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { selectedCompanyId: companyId } = useAuth()

  async function refreshCreatedCalendarTask(
    period: CalendarMonth,
    phase: TaskCalendarPhase,
  ): Promise<boolean> {
    if (companyId.value == null) {
      return false
    }

    const queryPrefix = [
      'tasks',
      companyId.value,
      'calendar',
      phase,
    ]

    const activeQueries = queryClient.getQueriesData<PaginatedResponse<Task>>({
      queryKey: queryPrefix,
      type: 'active',
    })
    const activeQueryKey = activeQueries[0]?.[0]

    if (!activeQueryKey) {
      return false
    }

    const cachedQuery = activeQueryKey[4]
    const range = calendarVisibleRange(period)
    const extra = typeof cachedQuery === 'object' && cachedQuery != null
      ? Object.fromEntries(
          Object.entries(cachedQuery).filter(([key]) => !RANGE_QUERY_KEYS.has(key)),
        )
      : {}
    const query = {
      ...extra,
      date_from: range.dateFrom,
      date_to: range.dateTo,
    }
    const calendarBase = `/api/tasks/company/${companyId.value}/calendar`
    const path = phase === 'close'
      ? `${calendarBase}/closing-date/`
      : `${calendarBase}/`

    const data = await $api<PaginatedResponse<Task>>(path, { query })

    queryClient.setQueriesData<PaginatedResponse<Task>>(
      { queryKey: queryPrefix, type: 'active' },
      data,
    )

    return true
  }

  return { refreshCreatedCalendarTask }
}
