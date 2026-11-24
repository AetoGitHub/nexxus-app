import { useQueryClient } from '@tanstack/vue-query'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'
import type { TaskReviewResponse } from '~/features/tasks/types/task.types'
import { invalidateTaskQueries, moveTaskToEndInLists, patchTaskInLists } from '~/features/tasks/utils/task-query.util'

/** Peticiones en vuelo por tarea: evita doble clic mientras responde el servidor. */
const inFlight = reactive(new Set<number>())

/**
 * Marca personal "Revisada" (POST/DELETE /api/tasks/:id/review/) con actualización optimista y reversión si falla.
 * - `markReviewed`: el ojo de la ficha. Cada toque vuelve a marcar con la hora actual y la tarea baja hasta el final
 *   de su lista (la API ordena: la marcada más recientemente va al final; ver `moveTaskToEndInLists`).
 * - `unmarkReviewed`: «Quitar revisada» del detalle; la tarea vuelve a su lugar normal.
 * Después se recargan las listas para que el backend la deje en su lugar real.
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

  async function send(taskId: number, mark: boolean): Promise<TaskReviewResponse | null> {
    if (inFlight.has(taskId)) {
      return null
    }
    const hadOverride = taskId in overrides.value
    const previous = overrides.value[taskId]

    inFlight.add(taskId)
    setOverride(taskId, mark ? new Date().toISOString() : null)
    try {
      const response = await $api<TaskReviewResponse>(`/api/tasks/${taskId}/review/`, {
        method: mark ? 'POST' : 'DELETE',
      })
      setOverride(taskId, response.reviewed_at)
      // El orden lo da la API. Al marcar, la ficha baja al final de la lista cargada al instante (es la marcada más
      // reciente); al quitarla solo se limpia el campo y su lugar normal llega con el refresco.
      if (mark) {
        moveTaskToEndInLists(queryClient, taskId, { reviewed_at: response.reviewed_at })
      }
      else {
        patchTaskInLists(queryClient, taskId, { reviewed_at: null })
      }
      invalidateTaskQueries(queryClient)
      return response
    }
    catch (error) {
      setOverride(taskId, hadOverride ? previous : undefined)
      toast.add({
        title: t(mark ? 'tasks.review.errorMark' : 'tasks.review.errorUnmark'),
        description: parseFetchError(error),
        color: 'error',
      })
      return null
    }
    finally {
      inFlight.delete(taskId)
    }
  }

  /** Marca (o vuelve a marcar) y la manda al final. En móvil, la primera vez, aviso con «Deshacer» (quita la marca). */
  async function markReviewed(taskId: number, serverReviewedAt?: string | null) {
    const wasReviewed = reviewedAtOf(taskId, serverReviewedAt) != null
    const response = await send(taskId, true)
    if (response && !wasReviewed && isMobile.value) {
      toast.add({
        title: t('tasks.review.movedToEnd'),
        color: 'neutral',
        duration: 4000,
        actions: [{
          label: t('tasks.review.undo'),
          color: 'primary',
          variant: 'soft',
          onClick: () => {
            void send(taskId, false)
          },
        }],
      })
    }
  }

  async function unmarkReviewed(taskId: number) {
    await send(taskId, false)
  }

  return { markReviewed, unmarkReviewed, isPending }
}
