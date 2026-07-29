import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskLimitDatePayload } from '~/features/tasks/types/task.types'

/**
 * Actualiza solo limit_date vía PATCH /api/tasks/:id/update/.
 */
export function useUpdateTaskLimitDate() {
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
      payload: UpdateTaskLimitDatePayload
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
        title: t('tasks.kanban.dueMove.successTitle'),
        description: t('tasks.kanban.dueMove.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.kanban.dueMove.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
