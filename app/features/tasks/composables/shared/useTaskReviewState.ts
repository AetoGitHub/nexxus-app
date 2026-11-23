/**
 * Marca personal "Revisada" por tarea, compartida por todas las vistas (Kanban, lista, detalle, calendario).
 * Regla única: `reviewed_at` con fecha → revisada (al final de mis listas, con chip y botón activo) hasta que YO la
 * desmarque; `null` → no revisada. Ya no vence por tiempo.
 * - `overrides`: lo que el usuario marcó/desmarcó en esta sesión (optimista y luego lo que confirmó el servidor).
 *   Gana sobre el `reviewed_at` que trae la tarea en caché hasta que la lista se recarga.
 * No hay evento de websocket para esto (es personal): el estado local es responsabilidad del front.
 */
export function useTaskReviewState() {
  const { locale } = useI18n()
  const overrides = useState<Record<number, string | null>>('task-review-overrides', () => ({}))

  function setOverride(taskId: number, reviewedAt: string | null | undefined) {
    const next = { ...overrides.value }
    if (reviewedAt === undefined) {
      delete next[taskId]
    }
    else {
      next[taskId] = reviewedAt
    }
    overrides.value = next
  }

  /** `reviewed_at` de la tarea (el de esta sesión si la marqué/desmarqué, si no el del servidor) o null. */
  function reviewedAtOf(taskId: number, serverReviewedAt?: string | null): string | null {
    const value = taskId in overrides.value ? overrides.value[taskId] : serverReviewedAt
    return value || null
  }

  function isReviewed(task: { id: number, reviewed_at?: string | null }): boolean {
    return reviewedAtOf(task.id, task.reviewed_at) != null
  }

  /** Hora local corta (14:58) de un `reviewed_at`. */
  function timeLabelOf(reviewedAt: string): string {
    const date = new Date(reviewedAt)
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  return { overrides, setOverride, reviewedAtOf, isReviewed, timeLabelOf }
}
