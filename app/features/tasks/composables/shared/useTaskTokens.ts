import { useQueryClient } from '@tanstack/vue-query'
import { useTaskTokenState } from '~/features/tasks/composables/shared/useTaskTokenState'
import type { CreateTaskTokenResponse, TaskDetail } from '~/features/tasks/types/task.types'
import { bumpTokensByUser } from '~/features/tasks/utils/task-token.util'

/** Dar un token a una tarea con actualización optimista (ver `useTaskTokenState` para el conteo). */
export function useTaskTokens() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()
  const { patch, displayCount, applyServerCount, sortByTokens } = useTaskTokenState()

  /** Sube el número al instante y manda el token; si falla, regresa al valor anterior. */
  async function giveToken(taskId: number) {
    patch(taskId, current => ({ ...current, pending: current.pending + 1 }))

    try {
      const response = await $api<CreateTaskTokenResponse>('/api/tasks/tokens/create/', {
        method: 'POST',
        body: { task: taskId },
      })
      // El detalle en caché suma mi token en el mismo instante en que sale el pendiente: la lista del tooltip no retrocede.
      const me = user.value
      queryClient.setQueryData<TaskDetail>(['tasks', 'detail', taskId], current => (
        current && me
          ? {
              ...current,
              tokens_count: Math.max(current.tokens_count ?? 0, response.tokens_count),
              tokens_by_user: bumpTokensByUser(current.tokens_by_user ?? [], me),
            }
          : current
      ))
      patch(taskId, current => ({
        confirmed: Math.max(current.confirmed, response.tokens_count),
        pending: Math.max(0, current.pending - 1),
      }))
      // Reconcilia con el servidor (nombres completos, tokens de otras personas).
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] })
    }
    catch (error) {
      patch(taskId, current => ({ ...current, pending: Math.max(0, current.pending - 1) }))
      toast.add({
        title: t('tasks.tokens.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
  }

  return { displayCount, applyServerCount, sortByTokens, giveToken }
}
