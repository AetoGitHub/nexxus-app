import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskProjectPayload } from '~/features/tasks/types/task.types'
import { invalidateTaskQueries } from '~/features/tasks/utils/task-query.util'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Actualiza solo project vía PATCH /api/tasks/:id/update/.
 */
export function useUpdateTaskProject() {
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
      payload: UpdateTaskProjectPayload
    }) =>
      $api(`/api/tasks/${taskId}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    // Ver comentario en useUpdateTask.ts: el detalle ya está incluido en el
    // prefijo 'tasks', invalidarlo aparte duplicaba la petición.
    onSuccess: () => {
      invalidateTaskQueries(queryClient)
      toast.add({
        title: t('tasks.kanban.projectMove.successTitle'),
        description: t('tasks.kanban.projectMove.successDescription'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.kanban.projectMove.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
