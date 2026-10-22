import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { CloseTaskProcessPayload } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

function buildCloseProcessBody(payload: CloseTaskProcessPayload): Record<string, unknown> {
  const comment = payload.comment?.trim()

  return {
    task: payload.task,
    status: payload.status,
    ...(comment ? { comment } : {}),
    images: payload.images?.filter(Boolean) ?? [],
  }
}

/**
 * Cierra / avanza el proceso de una tarea vía POST /api/tasks/process/close/.
 */
export function useCloseTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { syncMovedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CloseTaskProcessPayload) =>
      $api('/api/tasks/process/close/', {
        method: 'POST',
        body: buildCloseProcessBody(payload),
      }),
    onSuccess: async (_data, variables) => {
      if (!await syncMovedTask(variables.task)) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
      toast.add({
        title: t('tasks.processClose.successTitle'),
        description: variables.status === 'complete'
          ? t('tasks.processClose.successComplete')
          : t('tasks.processClose.successInReview'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processClose.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
