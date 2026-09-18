import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateTaskPayload, TaskDetail } from '~/features/tasks/types/task.types'

/**
 * Crea una tarea vía POST /api/tasks/create/ e invalida las queries del módulo.
 * Devuelve el detalle creado (con `id`) para poder adjuntar documentos justo después.
 */
export function useCreateTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      $api<TaskDetail>('/api/tasks/create/', {
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
