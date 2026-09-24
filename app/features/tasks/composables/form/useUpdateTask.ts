import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskPayload } from '~/features/tasks/types/task.types'
import { invalidateTaskQueries } from '~/features/tasks/utils/task-query.util'

/**
 * Actualiza una tarea vía PATCH /api/tasks/:id/update/.
 */
export function useUpdateTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTaskPayload
    }) =>
      $api(`/api/tasks/${taskId}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    // El detalle ya está incluido en el prefijo 'tasks', invalidarlo aparte
    // duplicaba la petición (GET /tasks/:id/ dos veces). No se espera la
    // invalidación para no bloquear el cierre del formulario de edición.
    onSuccess: () => {
      invalidateTaskQueries(queryClient)
      toast.add({
        title: t('tasks.form.updateSuccessTitle'),
        description: t('tasks.form.updateSuccessDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.form.updateErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
