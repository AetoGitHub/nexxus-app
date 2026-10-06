import { useMutation } from '@tanstack/vue-query'
import { useTaskCreatedSync } from '~/features/tasks/composables/workspace/useTaskCreatedSync'
import type { CreateTaskPayload, CreateTaskResponse } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Crea una tarea vía POST /api/tasks/create/. En vez de invalidar el árbol
 * `['tasks']` completo, inserta la tarea creada directo en la vista/groupBy
 * activos (mismo mecanismo que usa el socket del tablero para las tareas
 * creadas por otros usuarios) — evita el refetch completo del tablero para
 * la propia acción de este usuario. Las tareas extra (`more_tasks`) se insertan
 * igual, una por una.
 */
export function useCreateTask() {
  const { $api } = useNuxtApp()
  const { syncCreatedTask } = useTaskCreatedSync()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      $api<CreateTaskResponse>('/api/tasks/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (created) => {
      const moreTasksIds = created.more_tasks_ids ?? []
      for (const taskId of [created.id, ...moreTasksIds]) {
        await syncCreatedTask(taskId)
      }
      toast.add({
        title: t('tasks.form.createSuccessTitle'),
        description: moreTasksIds.length
          ? t('tasks.form.createManySuccessDescription', { count: moreTasksIds.length + 1 })
          : t('tasks.form.createSuccessDescription'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
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
