import { FetchError } from 'ofetch'
import { useQueryClient } from '@tanstack/vue-query'
import { useKanbanRealtimeTask } from '~/features/tasks/composables/kanban/useKanbanRealtimeTask'
import type { CreateTaskChannelEvent } from '~/features/tasks/types/task.types'
import { useRealtimeStatus } from '~/shared/composables/useRealtimeStatus'
import { useWsTicket } from '~/shared/composables/useWsTicket'
import { useWsBaseUrl } from '~/shared/utils/api'

const RESYNC_DEBOUNCE_MS = 200

function isCreateTaskEvent(value: unknown): value is CreateTaskChannelEvent {
  if (typeof value !== 'object' || value == null) {
    return false
  }

  const event = value as Partial<CreateTaskChannelEvent>
  return event.event === 'create_task'
    && typeof event.task_pk === 'number'
    && Number.isInteger(event.task_pk)
    && event.task_pk > 0
}

/**
 * Canal de tablero (`/ws/tasks/channel/`): solo lectura, agrupado por
 * `selected_company` del usuario. Cualquier alta/cambio de Task dispara
 * un refetch de las queries activas del tablero.
 *
 * Publica su estado en `useRealtimeStatus` para el indicador del sidebar.
 */
export function useTaskChannelSocket() {
  const queryClient = useQueryClient()
  const wsBaseUrl = useWsBaseUrl()
  const { requestTicket } = useWsTicket()
  const { isLoggedIn } = useAuth()
  const { status, isConnected } = useRealtimeStatus()
  const {
    insertCreatedTask,
    insertCreatedDueTask,
    insertCreatedProjectTask,
    insertCreatedGroupTask,
    insertCreatedUserTask,
  } = useKanbanRealtimeTask()
  const route = useRoute()

  function queryParam(key: string) {
    const value = route.query[key]
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw : null
  }

  const isTasksKanbanActive = computed(() =>
    route.path === '/tasks' && queryParam('view') === 'kanban',
  )

  const kanbanGroupBy = computed(() => queryParam('groupBy') ?? 'all')

  function resolveKanbanInsert(taskPk: number) {
    if (!isTasksKanbanActive.value) {
      return null
    }

    if (kanbanGroupBy.value === 'due') {
      return insertCreatedDueTask(taskPk)
    }

    if (kanbanGroupBy.value === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (kanbanGroupBy.value === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (kanbanGroupBy.value === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    if (kanbanGroupBy.value === 'all') {
      return insertCreatedTask(taskPk)
    }

    return null
  }

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stableTimer: ReturnType<typeof setTimeout> | null = null
  let resyncTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let ticketAuthRetryUsed = false
  let shouldResync = false
  let generation = 0
  let disposed = false

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (stableTimer) {
      clearTimeout(stableTimer)
      stableTimer = null
    }
    if (resyncTimer) {
      clearTimeout(resyncTimer)
      resyncTimer = null
    }
  }

  function closeCurrentSocket() {
    generation += 1
    clearTimers()

    if (
      socket
      && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000)
    }
    socket = null
  }

  function scheduleReconnect(immediate = false) {
    if (disposed) {
      return
    }

    status.value = 'reconnecting'
    shouldResync = true
    reconnectAttempt += 1

    const baseDelay = immediate
      ? 0
      : Math.min(1000 * 2 ** (reconnectAttempt - 1), 30_000)
    const delay = immediate
      ? 0
      : Math.round(baseDelay * (0.75 + Math.random() * 0.5))

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  function resyncBoard() {
    void queryClient.invalidateQueries({
      queryKey: ['tasks'],
      type: 'active',
      predicate: query => query.queryKey[1] !== 'messages',
    })
  }

  function scheduleBoardResync() {
    if (resyncTimer) {
      return
    }

    resyncTimer = setTimeout(() => {
      resyncTimer = null
      resyncBoard()
    }, RESYNC_DEBOUNCE_MS)
  }

  async function connect() {
    const currentGeneration = ++generation
    status.value = reconnectAttempt > 0 ? 'reconnecting' : 'connecting'

    let ticket: string
    try {
      const response = await requestTicket()
      ticket = response.ticket
    }
    catch (error) {
      if (disposed || currentGeneration !== generation) {
        return
      }

      if (error instanceof FetchError && error.status === 401) {
        status.value = 'error'
        return
      }

      scheduleReconnect()
      return
    }

    if (disposed || currentGeneration !== generation) {
      return
    }

    const nextSocket = new WebSocket(
      `${wsBaseUrl}/ws/tasks/channel/?ticket=${encodeURIComponent(ticket)}`,
    )
    socket = nextSocket

    nextSocket.onopen = () => {
      if (disposed || currentGeneration !== generation) {
        nextSocket.close(1000)
        return
      }

      status.value = 'connected'

      if (shouldResync) {
        shouldResync = false
        resyncBoard()
      }

      stableTimer = setTimeout(() => {
        reconnectAttempt = 0
        ticketAuthRetryUsed = false
        stableTimer = null
      }, 5000)
    }

    nextSocket.onmessage = (message) => {
      let event: unknown
      try {
        event = JSON.parse(message.data as string)
      }
      catch {
        return
      }

      if (isCreateTaskEvent(event)) {
        const insertCreated = resolveKanbanInsert(event.task_pk)
        if (!insertCreated) {
          return
        }

        void insertCreated
          .then((found) => {
            if (!found) {
              scheduleBoardResync()
            }
          })
          .catch(() => {
            // Si falla una consulta puntual, recuperamos consistencia por refetch.
            scheduleBoardResync()
          })
        return
      }

      // Los demás eventos conservan el refetch genérico hasta tener handler propio.
      scheduleBoardResync()
    }

    nextSocket.onclose = (event) => {
      if (socket === nextSocket) {
        socket = null
      }
      if (disposed || currentGeneration !== generation) {
        return
      }

      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = null
      }

      if (event.code === 1000) {
        status.value = 'offline'
        return
      }

      if (event.code === 4403) {
        status.value = 'error'
        return
      }

      if (event.code === 4401) {
        if (ticketAuthRetryUsed) {
          status.value = 'error'
          return
        }

        ticketAuthRetryUsed = true
        scheduleReconnect(true)
        return
      }

      // 4400: sin company seleccionada — nuevo ticket + backoff.
      scheduleReconnect()
    }

    nextSocket.onerror = () => {
      // `onclose` define la política de reconexión y evita reintentos duplicados.
    }
  }

  function reconnect() {
    if (disposed || !isLoggedIn.value) {
      return
    }

    closeCurrentSocket()
    reconnectAttempt = 0
    ticketAuthRetryUsed = false
    shouldResync = true
    void connect()
  }

  // Sin sesión no hay ticket posible: el túnel sigue al estado de login.
  watch(isLoggedIn, (loggedIn) => {
    if (!import.meta.client) {
      return
    }

    closeCurrentSocket()
    reconnectAttempt = 0
    ticketAuthRetryUsed = false
    shouldResync = false

    if (loggedIn) {
      void connect()
      return
    }

    status.value = 'offline'
  }, { immediate: true })

  onScopeDispose(() => {
    disposed = true
    closeCurrentSocket()
    status.value = 'offline'
  })

  return {
    status,
    isConnected,
    reconnect,
  }
}
