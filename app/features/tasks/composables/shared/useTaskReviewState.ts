/** La marca "Revisada" dura 24 h; después la tarea regresa sola a su lugar. */
export const TASK_REVIEW_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Marca personal "Revisada" por tarea, compartida por todas las vistas (Kanban, lista, detalle, calendario).
 * - `overrides`: lo que el usuario marcó/desmarcó en esta sesión (optimista y luego lo que confirmó el servidor).
 *   Gana sobre el `reviewed_at` que trae la tarea en caché hasta que la lista se recarga.
 * - Una marca vencida (`now >= reviewed_at + 24 h`) cuenta como no revisada aunque la pantalla lleve abierta mucho tiempo.
 * No hay evento de websocket para esto (es personal): el estado local es responsabilidad del front.
 */
export function useTaskReviewState() {
  const { locale } = useI18n()
  const overrides = useState<Record<number, string | null>>('task-review-overrides', () => ({}))
  /** Reloj compartido (cada minuto) para que las marcas vencidas desaparezcan sin recargar. */
  const now = useState<number>('task-review-now', () => Date.now())
  if (import.meta.client) {
    ensureReviewClock(now)
  }

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

  /** `reviewed_at` vigente de la tarea (o null si no está revisada o ya venció). */
  function reviewedAtOf(taskId: number, serverReviewedAt?: string | null): string | null {
    const value = taskId in overrides.value ? overrides.value[taskId] : serverReviewedAt
    if (!value) {
      return null
    }
    const time = Date.parse(value)
    if (Number.isNaN(time) || now.value >= time + TASK_REVIEW_TTL_MS) {
      return null
    }
    return value
  }

  function isReviewed(task: { id: number, reviewed_at?: string | null }): boolean {
    return reviewedAtOf(task.id, task.reviewed_at) != null
  }

  /** Hora local corta (10:35) de un `reviewed_at`. */
  function timeLabelOf(reviewedAt: string): string {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(new Date(reviewedAt))
  }

  return { overrides, setOverride, reviewedAtOf, isReviewed, timeLabelOf }
}

let reviewClockTimer: ReturnType<typeof setInterval> | null = null

function ensureReviewClock(now: Ref<number>) {
  if (reviewClockTimer) {
    return
  }
  reviewClockTimer = setInterval(() => {
    now.value = Date.now()
  }, 60_000)
}
