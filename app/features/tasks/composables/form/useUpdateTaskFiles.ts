import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskFilesPayload } from '~/features/tasks/types/task.types'

/**
 * Adjunta documentos (TaskFile) a la tarea vía PATCH parcial /api/tasks/:id/update/.
 * Sin toast propio: el slideover de la tarea es quien decide cómo comunicar
 * el resultado junto con el resto del submit (crear/editar).
 */
export function useUpdateTaskFiles() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTaskFilesPayload
    }) =>
      $api(`/api/tasks/${taskId}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    // Ver comentario en useUpdateTask.ts: el detalle ya está incluido en el
    // prefijo 'tasks', invalidarlo aparte duplicaba la petición.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
