import { useMutation } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { CreateTaskPayload, TaskDetail } from '~/features/tasks/types/task.types'

/**
 * Crea una tarea vía POST /api/tasks/create/. En vez de invalidar el árbol
 * `['tasks']` completo, inserta la tarea creada directo en la vista/groupBy
 * activos (mismo mecanismo que usa el socket del tablero para las tareas
 * creadas por otros usuarios) — evita el refetch completo del tablero para
 * la propia acción de este usuario.
 */
export function useCreateTask() {
  const { $api } = useNuxtApp()
  const { syncCreatedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      $api<TaskDetail>('/api/tasks/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (created) => {
      await syncCreatedTask(created.id)
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
