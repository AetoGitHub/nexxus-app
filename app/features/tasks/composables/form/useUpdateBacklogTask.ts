import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateBacklogTaskPayload } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Edita los campos propios de una tarea de backlog (nombre/descripción/proyecto)
 * vía PATCH /api/tasks/:id/update/.
 */
export function useUpdateBacklogTask() {
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
      payload: UpdateBacklogTaskPayload
    }) =>
      $api(`/api/tasks/${taskId}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId] }),
      ])
      toast.add({
        title: t('tasks.form.updateSuccessTitle'),
        description: t('tasks.form.updateSuccessDescription'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
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
