import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ReopenTaskProcessPayload } from '~/features/tasks/types/task.types'

function buildReopenProcessBody(payload: ReopenTaskProcessPayload): FormData | Record<string, unknown> {
  const comment = payload.comment?.trim()
  const images = payload.images?.filter(Boolean) ?? []

  if (images.length === 0) {
    return {
      task: payload.task,
      ...(comment ? { comment } : {}),
      images: [],
    }
  }

  const body = new FormData()
  body.append('task', String(payload.task))
  if (comment) {
    body.append('comment', comment)
  }
  for (const file of images) {
    body.append('images', file)
  }
  return body
}

/**
 * Reabre una tarea completada vía POST /api/tasks/process/reopen/.
 */
export function useReopenTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: ReopenTaskProcessPayload) =>
      $api('/api/tasks/process/reopen/', {
        method: 'POST',
        body: buildReopenProcessBody(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('tasks.processReopen.successTitle'),
        description: t('tasks.processReopen.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processReopen.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
