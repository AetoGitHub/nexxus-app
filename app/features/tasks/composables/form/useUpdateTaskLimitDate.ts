import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateTaskLimitDatePayload } from '~/features/tasks/types/task.types'
import { invalidateTaskQueries, patchTaskInLists } from '~/features/tasks/utils/task-query.util'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Actualiza solo limit_date vía PATCH /api/tasks/:id/update/.
 */
export function useUpdateTaskLimitDate() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t, locale } = useI18n()

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTaskLimitDatePayload
    }) =>
      $api(`/api/tasks/${taskId}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    // Ver comentario en useUpdateTask.ts: el detalle ya está incluido en el
    // prefijo 'tasks', invalidarlo aparte duplicaba la petición.
    onSuccess: (response, { taskId, payload }) => {
      const newDay = String(payload.limit_date).slice(0, 10)
      // La tarjeta muestra el día nuevo al instante en todas las listas cargadas (Kanban, lista, por proyecto…),
      // sin esperar el refetch; la respuesta trae `limit_date` (instante) y, si no trae `limit_day`, se usa el enviado.
      const saved = (response ?? {}) as { limit_date?: string | null, limit_day?: string | null }
      patchTaskInLists(queryClient, taskId, {
        limit_day: saved.limit_day ?? newDay,
        ...(saved.limit_date ? { limit_date: saved.limit_date } : {}),
      })
      invalidateTaskQueries(queryClient)
      // Dice a qué día quedó (el `limit_date` que se manda es "YYYY-MM-DD"): se arma en local para no cambiar de día.
      const [year, month, day] = newDay.split('-').map(Number)
      const dateLabel = year && month && day
        ? new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day))
        : ''
      toast.add({
        title: t('tasks.kanban.dueMove.successTitle'),
        description: dateLabel
          ? t('tasks.quickDue.successDescription', { date: dateLabel })
          : t('tasks.kanban.dueMove.successDescription'),
        icon: 'i-lucide-calendar-check',
        color: 'success',
        duration: Math.max(TASK_SUCCESS_TOAST_MS, 3500),
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.kanban.dueMove.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
