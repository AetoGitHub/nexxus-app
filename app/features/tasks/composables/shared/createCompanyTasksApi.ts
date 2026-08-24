import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Task, TaskListFilters } from '~/features/tasks/types/task.types'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'

/**
 * Factory compartido para queries de tareas por empresa.
 * Centraliza companyId (`selected_company.id` de la sesión), filtros
 * (`toTaskListQuery`) y queryKeys.
 */
export function createCompanyTasksApi(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const query = computed(() => toTaskListQuery(toValue(filters)))
  const hasCompany = computed(() => companyId.value != null)

  function companyPath(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `/api/tasks/company/${companyId.value}${normalized}`
  }

  function countsQuery<T>(scope: string[], path: string) {
    return useQuery({
      queryKey: computed(() => ['tasks', companyId.value, ...scope, 'counts', query.value]),
      queryFn: () => $api<T>(companyPath(path), { query: query.value }),
      enabled: hasCompany,
    })
  }

  function listQuery(
    scope: string[],
    path: string,
    options: { enabled?: MaybeRefOrGetter<boolean> } = {},
  ) {
    return useQuery({
      queryKey: computed(() => ['tasks', companyId.value, ...scope, query.value]),
      queryFn: () =>
        $api<PaginatedResponse<Task>>(companyPath(path), { query: query.value }),
      enabled: computed(() =>
        hasCompany.value
        && (options.enabled === undefined ? true : toValue(options.enabled)),
      ),
    })
  }

  return { companyId, query, countsQuery, listQuery }
}
