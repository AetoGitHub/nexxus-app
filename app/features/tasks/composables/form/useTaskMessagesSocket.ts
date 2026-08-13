import { FetchError } from 'ofetch'
import { useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { useWsTicket } from '~/shared/composables/useWsTicket'
import { useWsBaseUrl } from '~/shared/utils/api'
import type { TaskMessage } from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'

export type TaskMessagesSocketStatus =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

const taskSocketStatuses = reactive<Record<number, TaskMessagesSocketStatus>>({})

export function isTaskMessagesSocketConnected(taskId: number) {
  return taskSocketStatuses[taskId] === 'connected'
}

export function useTaskMessagesSocket(
  taskId: MaybeRefOrGetter<number | null | undefined>,
) {
  const queryClient = useQueryClient()
  const wsBaseUrl = useWsBaseUrl()
  const { requestTicket } = useWsTicket()

  const resolvedTaskId = computed(() => toValue(taskId))
  const status = computed<TaskMessagesSocketStatus>(() => {
    const id = resolvedTaskId.value
    return id == null ? 'offline' : (taskSocketStatuses[id] ?? 'offline')
  })
  const isConnected = computed(() => status.value === 'connected')

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stableTimer: ReturnType<typeof setTimeout> | null = null
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
  }

  function closeCurrentSocket() {
    generation += 1
    clearTimers()

    // Cerramos también en CONNECTING para abortar el handshake y no dejar el túnel vivo.
    if (
      socket
      && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000)
    }
    socket = null
  }

  function scheduleReconnect(id: number, immediate = false) {
    if (disposed || resolvedTaskId.value !== id) {
      return
    }

    taskSocketStatuses[id] = 'reconnecting'
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
      void connect(id)
    }, delay)
  }

  function appendMessage(id: number, message: TaskMessage) {
    queryClient.setQueryData<PaginatedResponse<TaskMessage>>(
      ['tasks', 'messages', id],
      (old) => {
        if (!old || old.results.some(item => item.id === message.id)) {
          return old
        }

        return {
          ...old,
          results: [...old.results, message],
        }
      },
    )
  }

  async function connect(id: number) {
    const currentGeneration = ++generation
    taskSocketStatuses[id] = reconnectAttempt > 0 ? 'reconnecting' : 'connecting'

    let ticket: string
    try {
      const response = await requestTicket()
      ticket = response.ticket
    } catch (error) {
      if (
        disposed
        || resolvedTaskId.value !== id
        || currentGeneration !== generation
      ) {
        return
      }

      if (error instanceof FetchError && error.status === 401) {
        taskSocketStatuses[id] = 'error'
        return
      }

      scheduleReconnect(id)
      return
    }

    if (
      disposed
      || resolvedTaskId.value !== id
      || currentGeneration !== generation
    ) {
      return
    }

    const nextSocket = new WebSocket(
      `${wsBaseUrl}/ws/tasks/${id}/messages/?ticket=${encodeURIComponent(ticket)}`,
    )
    socket = nextSocket

    nextSocket.onopen = () => {
      if (
        disposed
        || resolvedTaskId.value !== id
        || currentGeneration !== generation
      ) {
        nextSocket.close(1000)
        return
      }

      taskSocketStatuses[id] = 'connected'

      if (shouldResync) {
        shouldResync = false
        void queryClient.invalidateQueries({
          queryKey: ['tasks', 'messages', id],
        })
      }

      stableTimer = setTimeout(() => {
        reconnectAttempt = 0
        ticketAuthRetryUsed = false
        stableTimer = null
      }, 5000)
    }

    nextSocket.onmessage = (event) => {
      try {
        appendMessage(id, JSON.parse(event.data) as TaskMessage)
      } catch {
        // Ignoramos frames que no tengan el payload JSON esperado.
      }
    }

    nextSocket.onclose = (event) => {
      if (socket === nextSocket) {
        socket = null
      }
      if (
        disposed
        || resolvedTaskId.value !== id
        || currentGeneration !== generation
      ) {
        return
      }

      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = null
      }

      if (event.code === 1000) {
        taskSocketStatuses[id] = 'offline'
        return
      }

      if (event.code === 4403) {
        taskSocketStatuses[id] = 'error'
        return
      }

      if (event.code === 4401) {
        if (ticketAuthRetryUsed) {
          taskSocketStatuses[id] = 'error'
          return
        }

        ticketAuthRetryUsed = true
        scheduleReconnect(id, true)
        return
      }

      scheduleReconnect(id)
    }

    nextSocket.onerror = () => {
      // `onclose` define la política de reconexión y evita reintentos duplicados.
    }
  }

  function reconnect() {
    const id = resolvedTaskId.value
    if (id == null || disposed) {
      return
    }

    closeCurrentSocket()
    reconnectAttempt = 0
    ticketAuthRetryUsed = false
    shouldResync = true
    void connect(id)
  }

  watch(
    resolvedTaskId,
    (id, previousId) => {
      closeCurrentSocket()
      reconnectAttempt = 0
      ticketAuthRetryUsed = false
      shouldResync = false

      if (previousId != null) {
        taskSocketStatuses[previousId] = 'offline'
      }
      if (id != null) {
        void connect(id)
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    disposed = true
    const id = resolvedTaskId.value
    closeCurrentSocket()
    if (id != null) {
      taskSocketStatuses[id] = 'offline'
    }
  })

  return {
    status,
    isConnected,
    reconnect,
  }
}
