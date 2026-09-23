import { useMutation, useQueryClient } from '@tanstack/vue-query'

/**
 * Elimina una subtarea vía DELETE /api/tasks/subtasks/:id/delete/.
 * Sin toast propio: el checklist del detalle decide cómo comunicar el error.
 */
export function useDeleteSubtask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ subtaskId }: { subtaskId: number, taskId: number }) =>
      $api(`/api/tasks/subtasks/${subtaskId}/delete/`, { method: 'DELETE' }),
    // Ver comentario en useCompleteSubtask.ts: solo el detalle trae subtareas.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId], exact: true })
    },
  })
}
