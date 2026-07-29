import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskProjectPayload } from '~/features/tasks/types/task.types'

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
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', variables.taskId] }),
      ])
      toast.add({
        title: t('tasks.kanban.projectMove.successTitle'),
        description: t('tasks.kanban.projectMove.successDescription'),
        color: 'success',
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
