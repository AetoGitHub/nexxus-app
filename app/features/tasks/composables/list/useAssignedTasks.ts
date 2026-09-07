import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import type {
  AssignedTaskCount,
  ProjectTaskSection,
  TaskListFilters,
  UserDropdown,
} from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import { fetchTaskListNextPage, taskListInfiniteQueryOptions } from '~/features/tasks/utils/task-infinite.util'

const GROUP_SECTION_COLORS = ['#6366f1', '#28ceab', '#f97316', '#8b5cf6', '#dc2626', '#6b7280']

/**
 * Server state de tareas agrupadas por usuario asignado vía TanStack Query.
 */
export function useAssignedTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId: companyId } = useAuth()
  const hasCompany = computed(() => companyId.value != null)

  const usersBase = '/api/tools/dropdown/users'
  const tasksBase = computed(() => `/api/tasks/company/${companyId.value}/assigned`)
  const query = computed(() => toTaskListQuery(toValue(filters)))

  const users = useQuery({
    queryKey: ['tasks', 'users', 'dropdown'],
    queryFn: () => $api<PaginatedResponse<UserDropdown>>(`${usersBase}/`),
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId.value, 'assigned', 'counts', query.value]),
    queryFn: () => $api<AssignedTaskCount[]>(`${tasksBase.value}/counts/`, { query: query.value }),
    enabled: hasCompany,
  })

  const userList = computed(() => extractResults(users.data.value))

  const userIds = computed(() => userList.value.map(u => u.id))

  const taskQueries = useQueries({
    queries: computed(() => {
      const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

      return userIds.value.map((id) => {
        const total = countsMap.get(id) ?? 0
        return taskListInfiniteQueryOptions({
          $api,
          queryKey: ['tasks', companyId.value, 'assigned', id, query.value],
          url: `${tasksBase.value}/${id}/`,
          query: query.value,
          enabled: hasCompany.value && total > 0,
        })
      })
    }),
  })

  const sections = computed<ProjectTaskSection[]>(() => {
    const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

    return userList.value.map((user, index) => {
      const queryResult = taskQueries.value[index]
      const total = countsMap.get(user.id) ?? 0
      const tasks = total > 0 ? extractResults(queryResult?.data) : []
      const fallbackColor = GROUP_SECTION_COLORS[index % GROUP_SECTION_COLORS.length] ?? '#6b7280'

      return {
        id: user.id,
        name: user.username,
        count: total,
        dotColor: tasks[0]?.project_color?.trim()
          ? resolveThemeColor(tasks[0].project_color)
          : fallbackColor,
        tasks,
        loading: total > 0 && (queryResult?.isPending ?? false),
        error: queryResult?.isError ?? false,
        hasNextPage: queryResult?.hasNextPage ?? false,
        isFetchingNextPage: queryResult?.isFetchingNextPage ?? false,
      }
    })
  })

  function loadMore(sectionId: string | number) {
    const index = userIds.value.findIndex(id => id === Number(sectionId))
    const queryResult = taskQueries.value[index]
    if (queryResult) {
      fetchTaskListNextPage(queryResult)
    }
  }

  return { users, counts, sections, loadMore }
}
