import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Task, TaskListFilters } from '~/features/tasks/types/task.types'
import { getPaginatedNextPageParam } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'

/**
 * Factory compartido para queries de tareas por empresa.
 * Centraliza companyId (`selected_company.id` de la sesión), filtros
 * (`toTaskListQuery`) y queryKeys.
 */
export function createCompanyTasksApi(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const { adminQuery } = useTaskAdminView()
  const query = computed(() => ({
    ...toTaskListQuery(toValue(filters)),
    ...adminQuery.value,
  }))
  const hasCompany = computed(() => companyId.value != null)

  function companyPath(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `/api/tasks/company/${companyId.value}${normalized}`
  }

  /**
   * `extraQuery` se mezcla encima de `query` (filtros compartidos) pero, a
   * diferencia de `filters`, solo entra en el queryKey/params de ESTA llamada
   * — usado por la columna Completado para mandar date_from/date_to sin que
   * el resto de las columnas del Kanban (que comparten `filters`) se vean
   * afectadas ni se refetcheen de más.
   */
  function countsQuery<T>(
    scope: string[],
    path: string,
    options: { extraQuery?: MaybeRefOrGetter<Record<string, string> | undefined> } = {},
  ) {
    const extraQuery = computed(() => toValue(options.extraQuery))
    return useQuery({
      queryKey: computed(() => ['tasks', companyId.value, ...scope, 'counts', query.value, extraQuery.value]),
      queryFn: () => $api<T>(companyPath(path), { query: { ...query.value, ...extraQuery.value } }),
      enabled: hasCompany,
    })
  }

  function listQuery(
    scope: string[],
    path: string,
    options: {
      enabled?: MaybeRefOrGetter<boolean>
      extraQuery?: MaybeRefOrGetter<Record<string, string> | undefined>
    } = {},
  ) {
    const extraQuery = computed(() => toValue(options.extraQuery))
    return useInfiniteQuery({
      queryKey: computed(() => ['tasks', companyId.value, ...scope, query.value, extraQuery.value]),
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        pageParam
          ? $api<PaginatedResponse<Task>>(pageParam)
          : $api<PaginatedResponse<Task>>(companyPath(path), { query: { ...query.value, ...extraQuery.value } }),
      getNextPageParam: getPaginatedNextPageParam,
      enabled: computed(() =>
        hasCompany.value
        && (options.enabled === undefined ? true : toValue(options.enabled)),
      ),
    })
  }

  return { companyId, query, countsQuery, listQuery }
}
