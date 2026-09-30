/**
 * Estado de tokens por tarea, compartido por todas las vistas (lista, kanban, detalle).
 * - `confirmed`: el mayor `tokens_count` que confirmó el servidor (respuesta del POST o
 *   `GET /api/tasks/channel/:id/`). Los tokens solo suben, por eso basta con el máximo.
 * - `pending`: clics cuya petición sigue en vuelo (actualización optimista).
 *
 * El número que se dibuja es `max(conteo de la tarea, confirmed) + pending`: si la petición
 * falla basta con restar el pendiente para volver al valor anterior.
 */
export interface TaskTokenState {
  confirmed: number
  pending: number
}

export function useTaskTokenState() {
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
   * Ordena una lista por tokens, de más a menos, al instante y sin refrescar. A igualdad de
   * tokens conserva el orden que ya traía la lista (el de la fecha que manda el backend).
   * Solo para listas que el backend ordena primero por tokens (no backlog, archivadas ni calendario).
   */
  function sortByTokens<T extends { id: number, tokens_count?: number }>(tasks: T[]): T[] {
    return tasks
      .map((task, index) => ({ task, index, count: displayCount(task.id, task.tokens_count) }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .map(entry => entry.task)
  }

  return { states, patch, displayCount, applyServerCount, sortByTokens }
}
