import type { InfiniteData, QueryClient } from '@tanstack/vue-query'
import type { Task } from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'

type TaskListData = InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task>

function patchPage(page: PaginatedResponse<Task>, taskId: number, changes: Partial<Task>): PaginatedResponse<Task> {
  if (!page.results.some(task => task.id === taskId)) {
    return page
  }
  return { ...page, results: page.results.map(task => (task.id === taskId ? { ...task, ...changes } : task)) }
}

/**
 * Aplica `changes` a la tarea `taskId` en todas las listas/tableros en caché (`['tasks', …]`, paginadas o infinite)
 * y en su detalle, para que la tarjeta se actualice al instante sin esperar el refetch.
 */
export function patchTaskInLists(queryClient: QueryClient, taskId: number, changes: Partial<Task>) {
  queryClient.setQueriesData<unknown>(
    {
      queryKey: ['tasks'],
      predicate: query => query.queryKey[1] !== 'messages' && query.queryKey[1] !== 'detail',
    },
    (current: unknown) => {
      const data = current as TaskListData | undefined
      if (!data || typeof data !== 'object') {
        return current
      }
      if ('pages' in data && Array.isArray(data.pages)) {
        return { ...data, pages: data.pages.map(page => patchPage(page, taskId, changes)) }
      }
      if (Array.isArray((data as PaginatedResponse<Task>).results)) {
        return patchPage(data as PaginatedResponse<Task>, taskId, changes)
      }
      return current
    },
  )
  queryClient.setQueryData<Record<string, unknown>>(['tasks', 'detail', taskId], current => (
    current ? { ...current, ...changes } : current
  ))
}

/**
 * Invalida listas/counts/detalle de tareas (prefijo `['tasks', ...]`) sin
 * tocar el chat de mensajes (`['tasks', 'messages', taskId]`): comparte el
 * mismo prefijo pero no tiene relación con estos cambios, y refetchearlo en
 * cada edición de tarea es puro desperdicio.
 */
export function invalidateTaskQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: query => query.queryKey[0] === 'tasks' && query.queryKey[1] !== 'messages',
  })
}
