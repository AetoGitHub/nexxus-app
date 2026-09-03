import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { TaskDetail } from '~/features/tasks/types/task.types'

/**
 * Detalle de una tarea vía GET /api/tasks/:id/.
 * Incluye `generated_from` (null = maestra; id = instancia autogenerada).
 */
export function useTaskDetail(taskId: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()

  return useQuery({
    queryKey: computed(() => ['tasks', 'detail', toValue(taskId)]),
    queryFn: () => $api<TaskDetail>(`/api/tasks/${toValue(taskId)}/`),
    enabled: computed(() => {
      const id = toValue(taskId)
      return id != null && id > 0
    }),
  })
}
