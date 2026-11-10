import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/** Registros del historial que se pueden editar. */
export type EditableHistoryType = 'process' | 'archive' | 'message'

export interface UpdateHistoryEventPayload {
  /** Tarea dueña del registro (para refrescar su historial). */
  taskId: number
  type: EditableHistoryType
  /** `detail.process` / `detail.archive` / `detail.message` del evento. */
  id: number
  /** Comentario (process/archive) o contenido del mensaje (message). */
  text: string
}

/**
 * Edita un registro del historial vía PATCH /api/tasks/more/info/:type/:id/update/.
 * Solo se manda el texto: imágenes y archivos no se tocan (si no se mandan, el backend los deja igual).
 * Al terminar se vuelve a pedir el historial.
 */
export function useUpdateHistoryEvent() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: UpdateHistoryEventPayload) =>
      $api(`/api/tasks/more/info/${payload.type}/${payload.id}/update/`, {
        method: 'PATCH',
        body: payload.type === 'message' ? { content: payload.text } : { comment: payload.text },
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', 'history', variables.taskId] })
      // Un mensaje editado también cambia el chat del detalle.
      if (variables.type === 'message') {
        await queryClient.invalidateQueries({ queryKey: ['tasks', 'messages', variables.taskId] })
      }
      toast.add({
        title: t('tasks.history.recordSaved'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.history.recordSaveError'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
