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
    // Solo el detalle de esta tarea trae subtareas: ninguna vista de lista/kanban
    // ni los conteos muestran datos de subtareas, así que invalidar `['tasks']`
    // completo (como se hacía antes) disparaba de más el refetch de todo el
    // Kanban/Pendiente de aprobación por cada check. `exact: true` acota la
    // invalidación a la query exacta del detalle.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId], exact: true })
    },
  })
}
