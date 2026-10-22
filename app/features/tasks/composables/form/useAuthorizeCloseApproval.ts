import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { AuthorizeCloseApprovalResponse } from '~/features/tasks/types/task.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

/** Id de la aprobación, o el id con la evidencia (URLs) que exige la última aprobación de una tarea con `requires_close_file`. */
export type AuthorizeCloseApprovalInput = number | { approvalId: number, images?: string[] }

/**
 * Autoriza un close_approval vía PATCH /api/tasks/close_approvals/:id/update/.
 * La aprobación que completa la tarea responde 400 si la tarea exige evidencia y no hay ninguna: `images` la aporta.
 */
export function useAuthorizeCloseApproval() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (input: AuthorizeCloseApprovalInput) => {
      const { approvalId, images } = typeof input === 'number' ? { approvalId: input, images: undefined } : input
      return $api<AuthorizeCloseApprovalResponse>(`/api/tasks/close_approvals/${approvalId}/update/`, {
        method: 'PATCH',
        body: images?.length ? { closed: true, images } : { closed: true },
      })
    },
    // No se espera la revalidación aquí: el modal (`TaskAuthorizeCloseModal`)
    // cierra el slideover de detalle justo después de este `onSuccess`, y si
    // el `mutateAsync` del caller se queda colgado hasta que `['tasks']`
    // refetchea, la data ya llega actualizada (approval cerrado) antes de que
    // el caller alcance a cerrar — el `v-if` que monta ese modal se vuelve
    // falso a mitad de su propio `onConfirm` y el cierre nunca se dispara.
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
