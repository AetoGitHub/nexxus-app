import { FetchError } from 'ofetch'
import { useQueryClient } from '@tanstack/vue-query'
import { useCalendarRealtimeTask } from '~/features/tasks/composables/calendar/useCalendarRealtimeTask'
import { useKanbanRealtimeTask } from '~/features/tasks/composables/kanban/useKanbanRealtimeTask'
import { useListRealtimeTask } from '~/features/tasks/composables/list/useListRealtimeTask'
import type {
  CreateMultipleTasksChannelEvent,
  CreateTaskChannelEvent,
  TaskCalendarPhase,
} from '~/features/tasks/types/task.types'
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

function isPositiveTaskId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isCreateMultipleTasksEvent(
  value: unknown,
): value is CreateMultipleTasksChannelEvent {
  if (typeof value !== 'object' || value == null) {
    return false
  }

  const event = value as Partial<CreateMultipleTasksChannelEvent>
  return event.event === 'create_multiple_tasks'
    && Array.isArray(event.task_pks)
    && event.task_pks.length > 0
    && event.task_pks.every(isPositiveTaskId)
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
  const { isLoggedIn, selectedCompanyId } = useAuth()
  const { status, isConnected } = useRealtimeStatus()
  const {
    insertCreatedTask,
    insertCreatedDueTask,
    insertCreatedProjectTask,
    insertCreatedGroupTask,
    insertCreatedUserTask,
  } = useKanbanRealtimeTask()
  const { refreshCreatedCalendarTask } = useCalendarRealtimeTask()
  const { insertCreatedListTask } = useListRealtimeTask()
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

  function resolveCalendarRefresh(taskPk: number) {
    if (route.path !== '/tasks' || queryParam('view') !== 'calendar') {
      return null
    }

    const groupBy = queryParam('groupBy') ?? 'all'

    if (groupBy === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (groupBy === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (groupBy === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    // Due no aplica al calendario.
    if (groupBy !== 'all') {
      return null
    }

    const year = Number(queryParam('year'))
    const month = Number(queryParam('month'))
    const rawPhase = queryParam('phase')
    const phase: TaskCalendarPhase = rawPhase === 'process' || rawPhase === 'close'
      ? rawPhase
      : 'start'

    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    return refreshCreatedCalendarTask({ year, month }, phase)
  }

  function resolveListInsert(taskPk: number) {
    if (route.path !== '/tasks' || queryParam('view') !== 'list') {
      return null
    }

    const groupBy = queryParam('groupBy') ?? 'all'

    if (groupBy === 'due') {
      return insertCreatedDueTask(taskPk)
    }

    if (groupBy === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (groupBy === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (groupBy === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    return groupBy === 'all' ? insertCreatedListTask(taskPk) : null
  }

  function resolveCreatedTaskSync(taskPk: number) {
    const calendarRefresh = resolveCalendarRefresh(taskPk)
    if (calendarRefresh) {
      return calendarRefresh
    }

    const listInsert = resolveListInsert(taskPk)
    if (listInsert) {
      return listInsert
    }

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
  let viewResyncTimer: ReturnType<typeof setTimeout> | null = null
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
    if (viewResyncTimer) {
      clearTimeout(viewResyncTimer)
      viewResyncTimer = null
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

  /** Prefijos de query de la vista/groupBy actuales (lista, kanban o calendario). */
  function currentViewQueryKeys(): Array<Array<string | number>> {
    const companyId = selectedCompanyId.value
    if (companyId == null) {
      return []
    }

    const view = queryParam('view') ?? 'list'
    const groupBy = queryParam('groupBy') ?? 'all'

    if (route.path === '/tasks/pending-approval') {
      return [['tasks', companyId, 'close']]
    }

    if (route.path !== '/tasks') {
      return []
    }

    if (view === 'calendar') {
      const keys: Array<Array<string | number>> = [['tasks', companyId, 'calendar']]
      if (groupBy === 'project') {
        keys.push(['tasks', companyId, 'project'], ['tasks', companyId, 'projects'])
      }
      if (groupBy === 'group') {
        keys.push(['tasks', companyId, 'group'], ['tasks', companyId, 'groups'])
      }
      if (groupBy === 'user') {
        keys.push(['tasks', companyId, 'assigned'])
      }
      return keys
    }

    if (groupBy === 'due') {
      return [['tasks', companyId, 'overdue']]
    }
    if (groupBy === 'project') {
      return [['tasks', companyId, 'project'], ['tasks', companyId, 'projects']]
    }
    if (groupBy === 'group') {
      return [['tasks', companyId, 'group'], ['tasks', companyId, 'groups']]
    }
    if (groupBy === 'user') {
      return [['tasks', companyId, 'assigned']]
    }

    if (view === 'kanban') {
      return [['tasks', companyId, 'kanban']]
    }

    return [
      ['tasks', companyId, 'counts'],
      ['tasks', companyId, 'urgent'],
      ['tasks', companyId, 'today'],
      ['tasks', companyId, 'upcoming'],
    ]
  }

  function resyncCurrentView() {
    const queryKeys = currentViewQueryKeys()
    if (!queryKeys.length) {
      return
    }

    for (const queryKey of queryKeys) {
      void queryClient.invalidateQueries({
        queryKey,
        type: 'active',
      })
    }
  }

  function scheduleCurrentViewResync() {
    if (viewResyncTimer) {
      return
    }

    viewResyncTimer = setTimeout(() => {
      viewResyncTimer = null
      resyncCurrentView()
    }, RESYNC_DEBOUNCE_MS)
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
        const insertCreated = resolveCreatedTaskSync(event.task_pk)
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

      if (isCreateMultipleTasksEvent(event)) {
        scheduleCurrentViewResync()
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
