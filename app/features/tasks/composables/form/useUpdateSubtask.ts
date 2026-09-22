import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateSubtaskPayload } from '~/features/tasks/types/task.types'

/**
 * Edita una subtarea existente vía PATCH /api/tasks/subtasks/:id/update/.
 * Solo se llama a este endpoint (no al de la tarea padre). Sin `images`: se
 * omite para conservar las existentes (esta vista no las administra).
 */
export function useUpdateSubtask() {
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
      payload: UpdateSubtaskPayload
    }) =>
      $api(`/api/tasks/subtasks/${subtaskId}/update/`, {
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
