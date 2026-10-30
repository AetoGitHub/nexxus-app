import { useQueryClient } from '@tanstack/vue-query'
import { hasCloseEvidence } from '~/features/tasks/composables/form/useCloseEvidence'
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'
import { useCloseTaskProcess } from '~/features/tasks/composables/form/useCloseTaskProcess'
import { useStartTaskProcess } from '~/features/tasks/composables/form/useStartTaskProcess'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { CloseTaskProcessStatus, TaskDetail, TaskMessage } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

/**
 * Avances de proceso hacia adelante (iniciar, enviar a revisión, completar, autorizar) sin modal ni comentario. Los
 * regresos (devolver, rechazar, reabrir) siguen pidiendo confirmación y no pasan por aquí.
 *
 * Cada acción devuelve `true` si el backend la aceptó y `false` si no (error ya avisado por la mutación, o falta la
 * evidencia). Una tarea con `requires_close_file` que todavía no tiene archivo no puede cerrarse: en vez de dejar que
 * el backend responda 400 se avisa y se llama a `onNeedsEvidence` para que quien llama lleve al usuario al chat.
 */
export function useTaskProcessActions(options: { onNeedsEvidence?: (taskId: number) => void } = {}) {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { mutateAsync: startProcess } = useStartTaskProcess()
  const { mutateAsync: closeProcess } = useCloseTaskProcess()
  const { mutateAsync: authorizeApproval } = useAuthorizeCloseApproval()

  /** Misma consulta (y misma caché) que el detalle y el chat de la tarea, para decidir con datos frescos. */
  async function fetchDetail(taskId: number) {
    return queryClient.fetchQuery({
      queryKey: ['tasks', 'detail', taskId],
      queryFn: () => $api<TaskDetail>(`/api/tasks/${taskId}/`),
      staleTime: 0,
    })
  }

  async function fetchMessages(taskId: number) {
    return queryClient.fetchQuery({
      queryKey: ['tasks', 'messages', taskId],
      queryFn: () => $api<PaginatedResponse<TaskMessage>>(`/api/tasks/${taskId}/messages/`),
      staleTime: 0,
    })
  }

  function warnMissingEvidence(taskId: number) {
    toast.add({
      title: t('tasks.processClose.evidenceMissingTitle'),
      description: t('tasks.processClose.evidenceMissingDescription'),
      color: 'warning',
    })
    options.onNeedsEvidence?.(taskId)
  }

  /** `requiresFile` ya conocido (de la tarjeta) evita pedir el detalle cuando la tarea no exige evidencia. */
  async function lacksEvidence(taskId: number, requiresFile?: boolean) {
    if (requiresFile === false) {
      return false
    }
    const detail = await fetchDetail(taskId)
    if (!detail.requires_close_file) {
      return false
    }
    return !hasCloseEvidence(extractResults(await fetchMessages(taskId)), detail)
  }

  async function startTask(taskId: number) {
    try {
      await startProcess({ task: taskId })
      return true
    }
    catch {
      // El toast de error ya lo muestra la mutación.
      return false
    }
  }

  async function closeTask(taskId: number, status: CloseTaskProcessStatus, requiresFile?: boolean) {
    try {
      if (await lacksEvidence(taskId, requiresFile)) {
        warnMissingEvidence(taskId)
        return false
      }
      await closeProcess({ task: taskId, status })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * El backend solo exige la evidencia a la aprobación que completa la tarea (la última); las anteriores no se
   * bloquean.
   */
  async function authorizeTask(taskId: number, approvalId: number) {
    try {
      const detail = await fetchDetail(taskId)
      const isLastApproval = !(detail.close_approvals ?? []).some(approval => approval.id !== approvalId && !approval.closed)
      if (isLastApproval && detail.requires_close_file && !hasCloseEvidence(extractResults(await fetchMessages(taskId)), detail)) {
        warnMissingEvidence(taskId)
        return false
      }
      await authorizeApproval(approvalId)
      return true
    }
    catch {
      return false
    }
  }

  return { startTask, closeTask, authorizeTask }
}
