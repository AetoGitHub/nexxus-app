
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

  return { states, patch, displayCount, applyServerCount }
}
