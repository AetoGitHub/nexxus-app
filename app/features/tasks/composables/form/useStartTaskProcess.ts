import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { StartTaskProcessPayload } from '~/features/tasks/types/task.types'

function buildStartProcessBody(payload: StartTaskProcessPayload): FormData | Record<string, unknown> {
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
 * Inicia el proceso de una tarea vía POST /api/tasks/process/start/.
 */
export function useStartTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { syncMovedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: StartTaskProcessPayload) =>
      $api('/api/tasks/process/start/', {
        method: 'POST',
        body: buildStartProcessBody(payload),
      }),
    onSuccess: async (_data, variables) => {
      if (!await syncMovedTask(variables.task)) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
      toast.add({
        title: t('tasks.processStart.successTitle'),
        description: t('tasks.processStart.successDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processStart.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
