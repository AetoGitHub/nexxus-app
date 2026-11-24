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

/** Listas que no reordenan la marca «Revisada» (solo la muestran): ahí la ficha no se mueve. */
const NO_REORDER_SCOPES = new Set(['backlog', 'archived', 'calendar'])

/** Quita la tarea de donde esté y la pone al final de la última página cargada, con `changes` aplicados. */
function moveToEndOfLoaded(data: TaskListData, taskId: number, changes: Partial<Task>): TaskListData {
  const pages = 'pages' in data ? data.pages : [data]
  const found = pages.flatMap(page => page.results).find(task => task.id === taskId)
  if (!found) {
    return data
  }
  const moved = { ...found, ...changes }
  const nextPages = pages.map((page, index) => {
    const results = page.results.filter(task => task.id !== taskId)
    return index === pages.length - 1 ? { ...page, results: [...results, moved] } : { ...page, results }
  })
  return 'pages' in data ? { ...data, pages: nextPages } : nextPages[0]!
}

/**
 * «Revisada» marcada (o vuelta a marcar): la ficha baja al final de cada lista cargada al instante, como la ordena
 * el backend (la marcada más recientemente va hasta abajo). Backlog, archivadas y calendario solo actualizan el campo.
 * Después el llamador refresca las listas para quedarse con el orden real de la API.
 */
export function moveTaskToEndInLists(queryClient: QueryClient, taskId: number, changes: Partial<Task>) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['tasks'] })) {
    const key = query.queryKey
    if (key[1] === 'messages' || key[1] === 'detail') {
      continue
    }
    const data = query.state.data as TaskListData | undefined
    const isList = data != null && typeof data === 'object'
      && (('pages' in data && Array.isArray(data.pages)) || Array.isArray((data as PaginatedResponse<Task>).results))
    if (!isList) {
      continue
    }
    const next = NO_REORDER_SCOPES.has(String(key[2]))
      ? ('pages' in data ? { ...data, pages: data.pages.map(page => patchPage(page, taskId, changes)) } : patchPage(data, taskId, changes))
      : moveToEndOfLoaded(data, taskId, changes)
    if (next !== data) {
      queryClient.setQueryData(key, next)
    }
  }
  queryClient.setQueryData<Record<string, unknown>>(['tasks', 'detail', taskId], current => (
    current ? { ...current, ...changes } : current
  ))
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
