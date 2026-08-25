import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ArchiveTaskProcessPayload } from '~/features/tasks/types/task.types'
import { parseFetchError } from '~/shared/utils/error-message.util'

/**
 * Archiva una tarea vía POST /api/tasks/process/archive/.
 */
export function useArchiveTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: ArchiveTaskProcessPayload) => {
      const comment = payload.comment?.trim()
      return $api('/api/tasks/process/archive/', {
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
        title: t('tasks.processArchive.successTitle'),
        description: t('tasks.processArchive.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processArchive.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
