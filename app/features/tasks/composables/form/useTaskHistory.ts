import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { TaskHistory } from '~/features/tasks/types/task.types'

/**
 * Historial cronológico de una tarea vía GET /api/tasks/more/info/:id/.
 * Solo se pide mientras `enabled` sea true (el modal abierto). La llave empieza con `tasks`, así que
 * `invalidateTaskQueries` lo refresca tras cualquier acción sobre la tarea.
 */
export function useTaskHistory(
  taskId: MaybeRefOrGetter<number | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  // Sin `task.can_view_history` no se pide: el backend respondería 403.
  const { can } = usePermissions()

  return useQuery({
    queryKey: computed(() => ['tasks', 'history', toValue(taskId)]),
    queryFn: () => $api<TaskHistory>(`/api/tasks/more/info/${toValue(taskId)}/`),
    enabled: computed(() => {
      const id = toValue(taskId)
      return toValue(enabled) && can('task', 'view_history') && id != null && id > 0
    }),
  })
}
