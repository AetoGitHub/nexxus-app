import { useQueryClient } from '@tanstack/vue-query'
import { useTaskTokenState } from '~/features/tasks/composables/shared/useTaskTokenState'
import type { CreateTaskTokenResponse } from '~/features/tasks/types/task.types'

/** Dar un token a una tarea con actualización optimista (ver `useTaskTokenState` para el conteo). */
export function useTaskTokens() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { patch, displayCount, applyServerCount, sortByTokens } = useTaskTokenState()

  /** Sube el número al instante y manda el token; si falla, regresa al valor anterior. */
  async function giveToken(taskId: number) {
    patch(taskId, current => ({ ...current, pending: current.pending + 1 }))

    try {
      const response = await $api<CreateTaskTokenResponse>('/api/tasks/tokens/create/', {
        method: 'POST',
        body: { task: taskId },
      })
      // Un solo cambio de estado: el valor confirmado entra en el mismo instante en que sale el pendiente.
      patch(taskId, current => ({
        confirmed: Math.max(current.confirmed, response.tokens_count),
        pending: Math.max(0, current.pending - 1),
      }))
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'tokens', taskId] })
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
