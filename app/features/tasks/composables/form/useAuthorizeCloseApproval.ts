import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { AuthorizeCloseApprovalResponse } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/**
 * Autoriza un close_approval vía PATCH /api/tasks/close_approvals/:id/update/.
 * La aprobación que completa la tarea responde 400 si la tarea exige evidencia (un archivo en el chat) y no hay ninguna.
 */
export function useAuthorizeCloseApproval() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (approvalId: number) =>
      $api<AuthorizeCloseApprovalResponse>(`/api/tasks/close_approvals/${approvalId}/update/`, {
        method: 'PATCH',
        body: { closed: true },
      }),
    // No se espera la revalidación aquí: quien autoriza desde el slideover de
    // detalle lo cierra justo después de este `onSuccess`, y si el
    // `mutateAsync` del caller se queda colgado hasta que `['tasks']`
    // refetchea, la data ya llega actualizada (approval cerrado) antes de que
    // el caller alcance a cerrar.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('tasks.toUpdate.authorize.successTitle'),
        description: t('tasks.toUpdate.authorize.successDescription'),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({
        title: t('tasks.toUpdate.authorize.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
