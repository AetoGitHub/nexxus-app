import { useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { TaskTokenGiver } from '~/features/tasks/types/task.types'
import { extractResults, getPaginatedNextPageParam } from '~/shared/utils/paginated.util'

export interface TaskTokenGiverGroup {
  /** Id del profile que dio los tokens. */
  id: number
  name: string
  /** Tokens que dio esa persona. */
  count: number
  /** Fecha de su token más reciente. */
  latestAt: string
}

/**
 * Quién dio tokens a una tarea: GET /api/tasks/:id/tokens/ (cursor, más reciente primero).
 * Solo se consulta con `enabled` (al abrir el popover del detalle); las listas nunca lo piden.
 */
export function useTaskTokenGivers(
  taskId: MaybeRefOrGetter<number | null | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { $api } = useNuxtApp()
  const { t } = useI18n()

  const query = useInfiniteQuery({
    queryKey: computed(() => ['tasks', 'tokens', toValue(taskId)]),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      pageParam
        ? $api<PaginatedResponse<TaskTokenGiver>>(pageParam)
        : $api<PaginatedResponse<TaskTokenGiver>>(`/api/tasks/${toValue(taskId)}/tokens/`),
    getNextPageParam: getPaginatedNextPageParam,
    enabled: computed(() => toValue(enabled) && toValue(taskId) != null),
  })

  /** Una fila por persona ("Hector ×3"), en el orden de su token más reciente. */
  const groups = computed<TaskTokenGiverGroup[]>(() => {
    const byUser = new Map<number, TaskTokenGiverGroup>()

    for (const row of extractResults(query.data.value)) {
      const existing = byUser.get(row.created_by)
      if (existing) {
        existing.count += 1
        continue
      }
      byUser.set(row.created_by, {
        id: row.created_by,
        name: `${row.created_by_first_name} ${row.created_by_last_name}`.trim() || t('tasks.tokens.unknownUser'),
        count: 1,
        latestAt: row.created_at,
      })
    }

    return [...byUser.values()]
  })

  return { ...query, groups }
}
