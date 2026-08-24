import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Task, TaskListFilters } from '~/features/tasks/types/task.types'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'

export const CURRENT_TASKS_COMPANY_ID = 1

/**
 * Factory compartido para queries de tareas por empresa.
 * Centraliza companyId, filtros (`toTaskListQuery`) y queryKeys.
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function createCompanyTasksApi(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const companyId = CURRENT_TASKS_COMPANY_ID
  const query = computed(() => toTaskListQuery(toValue(filters)))

  function companyPath(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `/api/tasks/company/${companyId}${normalized}`
  }

  function countsQuery<T>(scope: string[], path: string) {
    return useQuery({
      queryKey: computed(() => ['tasks', companyId, ...scope, 'counts', query.value]),
      queryFn: () => $api<T>(companyPath(path), { query: query.value }),
    })
  }

  function listQuery(
    scope: string[],
    path: string,
    options: { enabled?: MaybeRefOrGetter<boolean> } = {},
  ) {
    return useQuery({
      queryKey: computed(() => ['tasks', companyId, ...scope, query.value]),
      queryFn: () =>
        $api<PaginatedResponse<Task>>(companyPath(path), { query: query.value }),
      enabled: computed(() =>
        options.enabled === undefined ? true : toValue(options.enabled),
      ),
    })
  }

  return { companyId, query, countsQuery, listQuery }
}
