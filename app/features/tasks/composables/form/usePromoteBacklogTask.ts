import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { PromoteBacklogTaskPayload } from '~/features/tasks/types/task.types'

/**
 * Promueve una tarea de backlog a Pendiente (drag Kanban Backlog → Pendiente)
 * vía POST /api/tasks/process/backlog/complete/. Invalida las queries del módulo.
 */
export function usePromoteBacklogTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: PromoteBacklogTaskPayload) =>
      $api('/api/tasks/process/backlog/complete/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('tasks.form.promoteSuccessTitle'),
        description: t('tasks.form.promoteSuccessDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.form.promoteError'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
