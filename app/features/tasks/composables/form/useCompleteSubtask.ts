import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CompleteSubtaskPayload } from '~/features/tasks/types/task.types'

/**
 * Marca/desmarca una subtarea vía PATCH /api/tasks/subtasks/:id/complete/.
 * Sin toast propio: el checklist del detalle decide cómo comunicar el error
 * (el éxito se ve solo, al revalidarse el detalle de la tarea).
 */
export function useCompleteSubtask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      subtaskId,
      payload,
    }: {
      subtaskId: number
      /** Solo para invalidar el detalle correcto; no viaja en el body. */
      taskId: number
      payload: CompleteSubtaskPayload
    }) =>
      $api(`/api/tasks/subtasks/${subtaskId}/complete/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId] }),
      ])
    },
  })
}
