import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { ReturnTaskProcessPayload, ReturnTaskProcessTarget } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/** Endpoint de cada regreso de estatus. */
const RETURN_ENDPOINTS: Record<ReturnTaskProcessTarget, string> = {
  backlog: '/api/tasks/process/backlog/return/',
}

function buildReturnProcessBody(payload: ReturnTaskProcessPayload): FormData | Record<string, unknown> {
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
 * Regresa una tarea a un estatus anterior: Pendiente → Backlog vía POST /api/tasks/process/backlog/return/.
 * El backend solo lo permite si la tarea nació en backlog; si no, responde 400 y se muestra su mensaje.
 */
export function useReturnTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { syncMovedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: ReturnTaskProcessPayload) =>
      $api(RETURN_ENDPOINTS[payload.target], {
        method: 'POST',
        body: buildReturnProcessBody(payload),
      }),
    onSuccess: async (_data, variables) => {
      if (!await syncMovedTask(variables.task)) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
      toast.add({
        title: t('tasks.processReturn.successTitle'),
        description: t(`tasks.processReturn.${variables.target}.success`),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.processReturn.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
