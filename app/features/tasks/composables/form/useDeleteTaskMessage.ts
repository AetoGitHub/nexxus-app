import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { TaskMessage } from '~/features/tasks/types/task.types'

interface DeleteTaskMessageVariables {
  id: number
  task: number
}

/**
 * Elimina (soft-delete) un mensaje del chat de una tarea.
 * DELETE /api/tasks/messages/:id/delete/
 */
export function useDeleteTaskMessage() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id }: DeleteTaskMessageVariables) =>
      $api<TaskMessage | null>(`/api/tasks/messages/${id}/delete/`, {
        method: 'DELETE',
      }),
    onSuccess: (message, variables) => {
      queryClient.setQueryData<PaginatedResponse<TaskMessage>>(
        ['tasks', 'messages', message?.task ?? variables.task],
        (old) => {
          if (!old) {
            return old
          }
          return {
            ...old,
            results: old.results.map((item) => {
              if (item.id !== variables.id) {
                return item
              }
              // El endpoint debería devolver el mensaje actualizado; si no, marcamos localmente.
              return message ?? {
                ...item,
                deleted: true,
                deleted_by: user.value?.id ?? null,
                deleted_by_username: user.value?.username ?? null,
                deleted_at: new Date().toISOString(),
              }
            }),
          }
        },
      )
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.messenger.deleteErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
