/**
 * Límite de un toque por minuto por usuario y tarea (idempotencia del botón de toque).
 *
 * - La hora del último toque se guarda por `usuario:tarea` en memoria compartida (todas las vistas ven lo mismo: lista,
 *   Kanban y detalle) y en `localStorage`, así que recargar la página no reinicia la espera.
 * - `tryLock` es síncrono: el primer clic toma el candado y los siguientes, aunque lleguen antes de que responda el
 *   servidor, se descartan. Si el toque falla, `release` devuelve el candado porque no se dio ningún toque.
 * - Un único reloj (1 s) actualiza la cuenta regresiva de todos los botones y se apaga cuando ya no queda ninguna espera.
 */
export const TASK_TOKEN_COOLDOWN_MS = 60_000

const STORAGE_KEY = 'nexxus-tasks-token-cooldowns'

type Cooldowns = Record<string, number>

/** Lee las esperas guardadas, sin las que ya vencieron; ante cualquier fallo del almacenamiento arranca vacío. */
function loadCooldowns(): Cooldowns {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Cooldowns
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(parsed).filter(([, at]) => typeof at === 'number' && now - at < TASK_TOKEN_COOLDOWN_MS),
    )
  }
  catch {
    return {}
  }
}

function saveCooldowns(value: Cooldowns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }
  catch {
    // Sin almacenamiento (modo privado, cuota): el límite sigue valiendo mientras la página esté abierta.
  }
}

let timer: ReturnType<typeof setInterval> | null = null

export function useTaskTokenCooldown() {
  const { user } = useAuth()
  const cooldowns = useState<Cooldowns>('task-token-cooldowns', () => (import.meta.client ? loadCooldowns() : {}))
  const now = useState<number>('task-token-cooldown-now', () => Date.now())

  const keyOf = (taskId: number) => `${user.value?.id ?? 'anon'}:${taskId}`

  /** Reloj compartido: avanza la cuenta regresiva y descarta las esperas vencidas; se apaga solo. */
  function ensureTicking() {
    if (!import.meta.client || timer || !Object.keys(cooldowns.value).length) {
      return
    }
    timer = setInterval(() => {
      const current = Date.now()
      now.value = current
      const active = Object.fromEntries(
        Object.entries(cooldowns.value).filter(([, at]) => current - at < TASK_TOKEN_COOLDOWN_MS),
      )
      if (Object.keys(active).length !== Object.keys(cooldowns.value).length) {
        cooldowns.value = active
        saveCooldowns(active)
      }
      if (!Object.keys(active).length && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  function remainingMs(taskId: number): number {
    const at = cooldowns.value[keyOf(taskId)]
    return at ? Math.max(0, at + TASK_TOKEN_COOLDOWN_MS - now.value) : 0
  }

  /** Segundos que faltan para poder dar otro toque a esa tarea (0 si ya se puede). */
  function remainingSeconds(taskId: number): number {
    return Math.ceil(remainingMs(taskId) / 1000)
  }

  function isCoolingDown(taskId: number): boolean {
    return remainingMs(taskId) > 0
  }

  /** Toma el candado de la tarea; `false` si ya se dio un toque en el último minuto. */
  function tryLock(taskId: number): boolean {
    const key = keyOf(taskId)
    const current = Date.now()
    const last = cooldowns.value[key]
    if (last && current - last < TASK_TOKEN_COOLDOWN_MS) {
      return false
    }
    now.value = current
    cooldowns.value = { ...cooldowns.value, [key]: current }
    saveCooldowns(cooldowns.value)
    ensureTicking()
    return true
  }

  /** Devuelve el candado: el toque no llegó a darse (falló la petición). */
  function release(taskId: number) {
    const { [keyOf(taskId)]: _released, ...rest } = cooldowns.value
    cooldowns.value = rest
    saveCooldowns(rest)
  }

  return { remainingSeconds, isCoolingDown, tryLock, release, ensureTicking }
}
