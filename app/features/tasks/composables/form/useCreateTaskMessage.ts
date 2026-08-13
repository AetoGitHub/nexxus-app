import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateTaskMessagePayload, TaskMessage } from '~/features/tasks/types/task.types'

/**
 * Crea un mensaje en el chat de una tarea.
 * POST /api/tasks/messages/create/
 */
export function useCreateTaskMessage() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: CreateTaskMessagePayload) =>
      $api<TaskMessage>('/api/tasks/messages/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (_data, variables) => {
      if (!isTaskMessagesSocketConnected(variables.task)) {
        await queryClient.invalidateQueries({
          queryKey: ['tasks', 'messages', variables.task],
        })
      }
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.messenger.sendErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
