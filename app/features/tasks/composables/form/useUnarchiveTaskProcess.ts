import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UnarchiveTaskProcessPayload } from '~/features/tasks/types/task.types'
import { parseFetchError } from '~/shared/utils/error-message.util'

/**
 * Desarchiva una tarea vía POST /api/tasks/process/unarchive/.
 */
export function useUnarchiveTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: UnarchiveTaskProcessPayload) => {
      const comment = payload.comment?.trim()
      return $api('/api/tasks/process/unarchive/', {
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
        title: t('tasks.processUnarchive.successTitle'),
        description: t('tasks.processUnarchive.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processUnarchive.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
