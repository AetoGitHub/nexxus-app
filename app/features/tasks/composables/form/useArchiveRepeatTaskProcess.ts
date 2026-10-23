import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type {
  ArchiveRepeatTaskPayload,
  ArchiveRepeatTaskResponse,
} from '~/features/tasks/types/task.types'
import { parseFetchError } from '~/shared/utils/error-message.util'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Elimina (archiva) una tarea repetitiva vía POST /api/tasks/process/repeat/archive/?future=<true|false>.
 * Con `future` archiva también las tareas de la misma serie con fecha de inicio igual o posterior (nunca las anteriores)
 * y la serie deja de generar tareas nuevas.
 */
export function useArchiveRepeatTaskProcess() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: ArchiveRepeatTaskPayload) => {
      const comment = payload.comment?.trim()
      return $api<ArchiveRepeatTaskResponse>('/api/tasks/process/repeat/archive/', {
        method: 'POST',
        query: { future: payload.future },
        body: {
          task: payload.task,
          ...(comment ? { comment } : {}),
        },
      })
    },
    onSuccess: async (response, payload) => {
      // Las tareas archivadas salen de las vistas al refrescar las listas (también llegan por el websocket).
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })

      const count = response?.archived_ids?.length ?? 1
      toast.add({
        title: payload.future
          ? t('tasks.repeatArchive.successMany', { count })
          : t('tasks.repeatArchive.successOne'),
        description: payload.future && response?.recurrence_paused
          ? t('tasks.repeatArchive.recurrencePaused')
          : undefined,
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS * 2,
      })
    },
    onError: (error) => {
      // El backend manda el motivo en español (no es repetitiva, ya archivada, sin serie, sin permiso).
      toast.add({
        title: t('tasks.repeatArchive.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
