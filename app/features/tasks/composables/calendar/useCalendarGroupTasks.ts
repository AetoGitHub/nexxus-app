import { useQueries, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { extractResults } from '~/shared/utils/paginated.util'
import { toTaskListQuery } from '~/features/tasks/utils/task-api.util'
import type {
  Task,
  TaskGroupListItem,
  TaskListFilters,
} from '~/features/tasks/types/task.types'

const FALLBACK_GROUP_COLORS = [
  '#6366f1',
  '#28ceab',
  '#f97316',
  '#8b5cf6',
  '#dc2626',
  '#0ea5e9',
  '#eab308',
  '#ec4899',
] as const

export interface CalendarGroup {
  id: number
  name: string
  color: string
  tasks: Task[]
  loading: boolean
  error: boolean
}

/**
 * Modo "por grupos" del calendario: lista grupos de la empresa y las tareas
 * de cada uno, usando el color del grupo.
 *
 * - Grupos → GET /api/tasks/company/:id/groups/
 * - Tareas por grupo → GET /api/tasks/company/:id/group/:groupId/
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useCalendarGroupTasks(
  filters: MaybeRefOrGetter<TaskListFilters> = {},
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const companyId = 1

  const groupsBase = `/api/tasks/company/${companyId}/groups`
  const tasksBase = `/api/tasks/company/${companyId}/group`
  const query = computed(() => toTaskListQuery(toValue(filters)))
  const isEnabled = computed(() => toValue(enabled))

  const groups = useQuery({
    queryKey: ['tasks', companyId, 'groups', 'list'],
    queryFn: () => $api<PaginatedResponse<TaskGroupListItem>>(`${groupsBase}/`),
    enabled: isEnabled,
  })

  const groupList = computed(() => extractResults(groups.data.value))
  const groupIds = computed(() => groupList.value.map(group => group.id))

  const taskQueries = useQueries({
    queries: computed(() =>
      groupIds.value.map(id => ({
        queryKey: ['tasks', companyId, 'group', id, query.value],
        queryFn: () => $api<PaginatedResponse<Task>>(`${tasksBase}/${id}/`, { query: query.value }),
        enabled: isEnabled.value && groupIds.value.length > 0,
      })),
    ),
  })

  const groupData = computed<CalendarGroup[]>(() =>
    groupList.value.map((group, index) => {
      const result = taskQueries.value[index]
      return {
        id: group.id,
        name: group.name,
        color: group.color?.trim()
          ? resolveThemeColor(group.color)
          : FALLBACK_GROUP_COLORS[index % FALLBACK_GROUP_COLORS.length]!,
        tasks: extractResults(result?.data),
        loading: result?.isPending ?? false,
        error: result?.isError ?? false,
      }
    }),
  )

  const isPending = computed(() =>
    groups.isPending.value || groupData.value.some(g => g.loading),
  )

  const isError = computed(() =>
    groups.isError.value || groupData.value.some(g => g.error),
  )

  return { groups: groupData, isPending, isError }
}
