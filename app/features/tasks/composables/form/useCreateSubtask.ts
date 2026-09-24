import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateSubtaskPayload } from '~/features/tasks/types/task.types'

/**
 * Agrega una subtarea a una tarea ya existente vía POST /api/tasks/subtasks/create/.
 * La respuesta del backend no trae `assigned_to_name`, así que la lista se
 * refresca invalidando el detalle en vez de insertar la fila a mano.
 */
export function useCreateSubtask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      /** Solo para invalidar el detalle correcto; el body ya lleva `task`. */
      taskId: number
      payload: CreateSubtaskPayload
    }) =>
      $api('/api/tasks/subtasks/create/', {
        method: 'POST',
        body: payload,
      }),
    // Ver comentario en useCompleteSubtask.ts: solo el detalle trae subtareas.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId], exact: true })
    },
  })
}
