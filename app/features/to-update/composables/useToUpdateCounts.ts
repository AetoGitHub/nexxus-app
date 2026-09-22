import type { MaybeRefOrGetter } from 'vue'
import type { TaskListFilters } from '~/features/tasks/types/task.types'
import type { ToUpdateCounts } from '~/features/to-update/types/to-update.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'

/** Conteos de tareas pendientes de aprobación para el perfil autenticado. */
export function useToUpdateCounts(
  filters: MaybeRefOrGetter<TaskListFilters> = {},
) {
  const api = createCompanyTasksApi(filters)
  const counts = api.countsQuery<ToUpdateCounts>(['close'], '/close/counts/')

  const actionableCount = computed(() => {
    const value = counts.data.value
    if (!value) {
      return 0
    }

    return value.pending + value.urgent + value.delayed + value.critical
  })

  const errorMessage = computed(() =>
    counts.error.value ? parseFetchError(counts.error.value) : '',
  )

  return {
    counts,
    actionableCount,
    errorMessage,
  }
}
