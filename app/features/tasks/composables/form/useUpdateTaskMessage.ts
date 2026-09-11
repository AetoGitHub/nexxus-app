import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { TaskMessage, UpdateTaskMessagePayload } from '~/features/tasks/types/task.types'

interface UpdateTaskMessageVariables {
  id: number
  payload: UpdateTaskMessagePayload
}

/**
 * Edita un mensaje del chat de una tarea.
 * PATCH /api/tasks/messages/:id/update/
 */
export function useUpdateTaskMessage() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateTaskMessageVariables) =>
      $api<TaskMessage>(`/api/tasks/messages/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: (message) => {
      queryClient.setQueryData<PaginatedResponse<TaskMessage>>(
        ['tasks', 'messages', message.task],
        (old) => {
          if (!old) {
            return old
          }
          return {
            ...old,
            results: old.results.map(item => item.id === message.id ? message : item),
          }
        },
      )
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.messenger.editErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
