import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateBacklogTaskPayload } from '~/features/tasks/types/task.types'

/**
 * Crea una tarea de backlog vía POST /api/tasks/backlog/create/ e invalida las queries del módulo.
 */
export function useCreateBacklogTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateBacklogTaskPayload) =>
      $api('/api/tasks/backlog/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('tasks.form.createSuccessTitle'),
        description: t('tasks.form.createSuccessDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.form.createError'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
