import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import { fetchTaskListNextPage, taskListInfiniteQueryOptions } from '~/features/tasks/utils/task-infinite.util'
import type {
  ProjectTaskSection,
  TaskGroupCount,
  TaskGroupListItem,
  TaskListFilters,
} from '~/features/tasks/types/task.types'

const GROUP_SECTION_COLORS = ['#6366f1', '#28ceab', '#f97316', '#8b5cf6', '#dc2626', '#6b7280']

/**
 * Server state de tareas agrupadas por grupo vía TanStack Query.
 *
 * - Grupos → GET /api/tasks/company/:id/groups/
 * - Counts → GET /api/tasks/company/:id/group/counts/ (+ filtros)
 * - Tareas → GET /api/tasks/company/:id/group/:groupId/
 */
export function useGroupTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const hasCompany = computed(() => companyId.value != null)

  const groupsBase = computed(() => `/api/tasks/company/${companyId.value}/groups`)
  const tasksBase = computed(() => `/api/tasks/company/${companyId.value}/group`)
  const query = computed(() => toTaskListQuery(toValue(filters)))

  const groups = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'groups', 'list']),
    queryFn: () => $api<PaginatedResponse<TaskGroupListItem>>(`${groupsBase.value}/`),
    enabled: hasCompany,
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'group', 'counts', query.value]),
    queryFn: () => $api<TaskGroupCount[]>(`${tasksBase.value}/counts/`, { query: query.value }),
    enabled: hasCompany,
  })

  const groupList = computed(() => extractResults(groups.data.value))

  const groupIds = computed(() => groupList.value.map(group => group.id))

  const taskQueries = useQueries({
    queries: computed(() => {
      const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

      return groupIds.value.map((id) => {
        const total = countsMap.get(id) ?? 0
        return taskListInfiniteQueryOptions({
          $api,
          queryKey: ['tasks', companyId.value, 'group', id, query.value],
          url: `${tasksBase.value}/${id}/`,
          query: query.value,
          enabled: hasCompany.value && total > 0,
        })
      })
    }),
  })

  const sections = computed<ProjectTaskSection[]>(() => {
    const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

    return groupList.value.map((group, index) => {
      const queryResult = taskQueries.value[index]
      const total = countsMap.get(group.id) ?? 0
      const tasks = total > 0 ? extractResults(queryResult?.data) : []

      return {
        id: group.id,
        name: group.name,
        count: total,
        dotColor: group.color?.trim()
          ? resolveThemeColor(group.color)
          : GROUP_SECTION_COLORS[index % GROUP_SECTION_COLORS.length]!,
        tasks,
        loading: total > 0 && (queryResult?.isPending ?? false),
        error: queryResult?.isError ?? false,
        hasNextPage: queryResult?.hasNextPage ?? false,
        isFetchingNextPage: queryResult?.isFetchingNextPage ?? false,
      }
    })
  })

  function loadMore(sectionId: string | number) {
    const index = groupIds.value.findIndex(id => id === Number(sectionId))
    const queryResult = taskQueries.value[index]
    if (queryResult) {
      fetchTaskListNextPage(queryResult)
    }
  }

  return { groups, counts, sections, loadMore }
}
