import { useQueryClient } from '@tanstack/vue-query'
import type {
  CalendarMonth,
  Task,
  TaskCalendarPhase,
} from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'

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
    const query = {
      ...(typeof cachedQuery === 'object' && cachedQuery != null ? cachedQuery : {}),
      year: period.year,
      month: period.month,
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
