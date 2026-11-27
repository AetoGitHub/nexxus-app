
/**
 * Estado de tokens por tarea, compartido por todas las vistas (lista, kanban, detalle).
 * - `confirmed`: el mayor `tokens_count` que confirmó el servidor (respuesta del POST o
 *   `GET /api/tasks/channel/:id/`). Los tokens solo suben, por eso basta con el máximo.
 * - `pending`: clics cuya petición sigue en vuelo (actualización optimista).
 *
 * El número que se dibuja es `max(conteo de la tarea, confirmed) + pending`: si la petición
 * falla basta con restar el pendiente para volver al valor anterior.
 */
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'

export interface TaskTokenState {
  confirmed: number
  pending: number
}

export function useTaskTokenState() {
  const { isReviewed } = useTaskReviewState()
  const states = useState<Record<number, TaskTokenState>>('task-tokens', () => ({}))

  function patch(taskId: number, change: (current: TaskTokenState) => TaskTokenState) {
    const current = states.value[taskId] ?? { confirmed: 0, pending: 0 }
    states.value = { ...states.value, [taskId]: change(current) }
  }

  /** Conteo a mostrar: lo que trae la tarea o lo confirmado (lo mayor) más los clics en vuelo. */
  function displayCount(taskId: number, serverCount = 0): number {
    const state = states.value[taskId]
    return Math.max(serverCount, state?.confirmed ?? 0) + (state?.pending ?? 0)
  }

  /** Registra un conteo real del servidor (respuesta del POST o evento en tiempo real). */
  function applyServerCount(taskId: number, count: number) {
    patch(taskId, current => ({ ...current, confirmed: Math.max(current.confirmed, count) }))
  }

  /**
   * Orden de las listas, al instante y sin refrescar (igual que el backend):
   * 1. más tokens primero (con los clics en vuelo);
   * 2. con los mismos tokens, las no revisadas antes que las que marqué «Revisada»;
   * 3. dentro de eso, el orden que ya traía la lista (la fecha que ordena el backend).
   * Solo para listas que el backend ordena por tokens (no backlog, archivadas ni calendario).
   */
  function sortByTokens<T extends { id: number, tokens_count?: number, reviewed_at?: string | null }>(tasks: T[]): T[] {
    return tasks
      .map((task, index) => ({
        task,
        index,
        count: displayCount(task.id, task.tokens_count),
        reviewed: isReviewed(task) ? 1 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.reviewed - b.reviewed || a.index - b.index)
      .map(entry => entry.task)
  }

  return { states, patch, displayCount, applyServerCount, sortByTokens }
}
