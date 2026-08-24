import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type {
  CalendarMonth,
  Task,
  TaskCalendarPhase,
  TaskListFilters,
} from '~/features/tasks/types/task.types'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'

/**
 * Tareas del mes para la vista calendario.
 *
 * - Inicio / Proceso → GET .../calendar/
 * - Cierre → GET .../calendar/closing-date/
 *
 * Reutiliza los mismos query params que listas/Kanban (`toTaskListQuery`).
 */
export function useCalendarTasks(
  period: MaybeRefOrGetter<CalendarMonth>,
  filters: MaybeRefOrGetter<TaskListFilters> = {},
  phase: MaybeRefOrGetter<TaskCalendarPhase> = 'start',
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()

  const year = computed(() => toValue(period).year)
  const month = computed(() => toValue(period).month)
  const resolvedPhase = computed(() => toValue(phase))
  const isEnabled = computed(() => toValue(enabled) && companyId.value != null)
  const query = computed(() => ({
    year: year.value,
    month: month.value,
    ...toTaskListQuery(toValue(filters)),
  }))

  const path = computed(() => {
    const base = `/api/tasks/company/${companyId.value}/calendar`
    return resolvedPhase.value === 'close'
      ? `${base}/closing-date/`
      : `${base}/`
  })

  const tasks = useQuery({
    queryKey: computed(() => [
      'tasks',
      companyId.value,
      'calendar',
      resolvedPhase.value,
      query.value,
    ]),
    queryFn: () =>
      $api<PaginatedResponse<Task>>(path.value, {
        query: query.value,
      }),
    enabled: isEnabled,
  })

  return { tasks }
}
