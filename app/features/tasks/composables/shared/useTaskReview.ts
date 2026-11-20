import { useQueryClient } from '@tanstack/vue-query'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'
import type { TaskReviewResponse } from '~/features/tasks/types/task.types'
import { invalidateTaskQueries } from '~/features/tasks/utils/task-query.util'

/** Peticiones en vuelo por tarea: evita doble clic mientras responde el servidor. */
const inFlight = reactive(new Set<number>())

/**
 * Marca o quita "Revisada" (POST/DELETE /api/tasks/:id/review/) con actualización optimista:
 * la tarea se va al final de su lista al instante (ver `sortByTokens`) y se revierte si falla.
 * Después se recargan las listas para que el backend la deje en su lugar real
 * (al final al marcarla, en su posición normal al quitarla).
 */
export function useTaskReview() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const { overrides, setOverride, reviewedAtOf } = useTaskReviewState()
  const isMobile = useMediaQuery('(max-width: 767px)')

  function isPending(taskId: number) {
    return inFlight.has(taskId)
  }

  async function toggleReview(taskId: number, serverReviewedAt?: string | null) {
    if (inFlight.has(taskId)) {
      return
    }
    const hadOverride = taskId in overrides.value
    const previous = overrides.value[taskId]
    const markReviewed = reviewedAtOf(taskId, serverReviewedAt) == null

    inFlight.add(taskId)
    setOverride(taskId, markReviewed ? new Date().toISOString() : null)
    try {
      const response = await $api<TaskReviewResponse>(`/api/tasks/${taskId}/review/`, {
        method: markReviewed ? 'POST' : 'DELETE',
      })
      setOverride(taskId, response.reviewed_at)
      invalidateTaskQueries(queryClient)
      // En móvil la ficha se va de la vista: aviso corto con "Deshacer" (DELETE).
      if (markReviewed && isMobile.value) {
        toast.add({
          title: t('tasks.review.movedToEnd'),
          color: 'neutral',
          duration: 4000,
          actions: [{
            label: t('tasks.review.undo'),
            color: 'primary',
            variant: 'soft',
            onClick: () => {
              void toggleReview(taskId, response.reviewed_at)
            },
          }],
        })
      }
    }
    catch (error) {
      setOverride(taskId, hadOverride ? previous : undefined)
      toast.add({
        title: t(markReviewed ? 'tasks.review.errorMark' : 'tasks.review.errorUnmark'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
    finally {
      inFlight.delete(taskId)
    }
  }

  return { toggleReview, isPending }
}
