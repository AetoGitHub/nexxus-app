import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { DeleteTaskProcessPayload } from '~/features/tasks/types/task.types'
import { parseFetchError } from '~/shared/utils/error-message.util'

/**
 * Elimina definitivamente una tarea archivada vía POST /api/tasks/process/delete/.
 */
export function useDeleteTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: DeleteTaskProcessPayload) => {
      const comment = payload.comment?.trim()
      return $api('/api/tasks/process/delete/', {
        method: 'POST',
        body: {
          task: payload.task,
          ...(comment ? { comment } : {}),
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('tasks.processDelete.successTitle'),
        description: t('tasks.processDelete.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processDelete.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
