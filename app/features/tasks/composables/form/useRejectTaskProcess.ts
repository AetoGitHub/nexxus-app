import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { RejectTaskProcessPayload } from '~/features/tasks/types/task.types'

function buildRejectProcessBody(payload: RejectTaskProcessPayload): FormData | Record<string, unknown> {
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
 * Rechaza una tarea en revisión vía POST /api/tasks/process/reject/.
 */
export function useRejectTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { syncMovedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: RejectTaskProcessPayload) =>
      $api('/api/tasks/process/reject/', {
        method: 'POST',
        body: buildRejectProcessBody(payload),
      }),
    onSuccess: async (_data, variables) => {
      if (!await syncMovedTask(variables.task)) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
      toast.add({
        title: t('tasks.processReview.rejectSuccessTitle'),
        description: t('tasks.processReview.rejectSuccessDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processReview.rejectErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
