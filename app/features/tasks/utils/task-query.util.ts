import type { QueryClient } from '@tanstack/vue-query'

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
