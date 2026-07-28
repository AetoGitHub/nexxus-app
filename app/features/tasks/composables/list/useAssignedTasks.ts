import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import type {
  AssignedTaskCount,
  ProjectTaskSection,
  Task,
  TaskListFilters,
  UserDropdown,
} from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'

const GROUP_SECTION_COLORS = ['#6366f1', '#28ceab', '#f97316', '#8b5cf6', '#dc2626', '#6b7280']

/**
 * Server state de tareas agrupadas por usuario asignado vía TanStack Query.
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useAssignedTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const { $api } = useNuxtApp()
  const companyId = 1

  const usersBase = '/api/tools/dropdown/users'
  const tasksBase = `/api/tasks/company/${companyId}/assigned`
  const query = computed(() => toTaskListQuery(toValue(filters)))

  const users = useQuery({
    queryKey: ['tasks', 'users', 'dropdown'],
    queryFn: () => $api<PaginatedResponse<UserDropdown>>(`${usersBase}/`),
  })

  const counts = useQuery({
    queryKey: computed(() => ['tasks', companyId, 'assigned', 'counts', query.value]),
    queryFn: () => $api<AssignedTaskCount[]>(`${tasksBase}/counts/`, { query: query.value }),
  })

  const userList = computed(() => extractResults(users.data.value))

  const userIds = computed(() => userList.value.map(u => u.id))

  const taskQueries = useQueries({
    queries: computed(() => {
      const countsMap = new Map((counts.data.value ?? []).map(c => [c.id, c.total]))

      return userIds.value.map(id => {
        const total = countsMap.get(id) ?? 0
        return {
          queryKey: ['tasks', companyId, 'assigned', id, query.value],
          queryFn: () => $api<PaginatedResponse<Task>>(`${tasksBase}/${id}/`, { query: query.value }),
          enabled: total > 0,
        }
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
        loading: total > 0 && (queryResult?.isLoading ?? false),
        error: queryResult?.isError ?? false,
      }
    })
  })

  return { users, counts, sections }
}
