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
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useCalendarTasks(
  period: MaybeRefOrGetter<CalendarMonth>,
  filters: MaybeRefOrGetter<TaskListFilters> = {},
  phase: MaybeRefOrGetter<TaskCalendarPhase> = 'start',
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const companyId = 1

  const year = computed(() => toValue(period).year)
  const month = computed(() => toValue(period).month)
  const resolvedPhase = computed(() => toValue(phase))
  const isEnabled = computed(() => toValue(enabled))
  const query = computed(() => ({
    year: year.value,
    month: month.value,
    ...toTaskListQuery(toValue(filters)),
  }))

  const path = computed(() => {
    const base = `/api/tasks/company/${companyId}/calendar`
    return resolvedPhase.value === 'close'
      ? `${base}/closing-date/`
      : `${base}/`
  })

  const tasks = useQuery({
    queryKey: computed(() => [
      'tasks',
      companyId,
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
