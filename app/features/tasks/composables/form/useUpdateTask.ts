import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskPayload } from '~/features/tasks/types/task.types'

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
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId] }),
      ])
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
