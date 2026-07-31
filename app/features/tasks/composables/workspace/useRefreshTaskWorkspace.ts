import { useQueryClient } from '@tanstack/vue-query'

/**
 * Refetch de las queries de tareas activas (listas/kanban/calendar
 * montadas en ese momento).
 */
export function useRefreshTaskWorkspace() {
  const queryClient = useQueryClient()
  const isRefreshing = ref(false)

  async function refresh() {
    if (isRefreshing.value) {
      return
    }

    isRefreshing.value = true
    try {
      await queryClient.refetchQueries({
        queryKey: ['tasks'],
        type: 'active',
      })
    }
    finally {
      isRefreshing.value = false
    }
  }

  return { refresh, isRefreshing }
}
