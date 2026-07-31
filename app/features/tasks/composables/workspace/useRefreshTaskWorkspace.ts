import { useQueryClient } from '@tanstack/vue-query'

/**
 * Refetch de las queries de tareas activas (listas/kanban/calendar
 * montadas en ese momento).
 */
export function useRefreshTaskWorkspace() {
  const { t } = useI18n()
  const toast = useToast()
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
      toast.add({
        title: t('tasks.refreshSuccessTitle'),
        description: t('tasks.refreshSuccessDescription'),
        color: 'success',
      })
    }
    catch (error) {
      toast.add({
        title: t('tasks.refreshErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
    finally {
      isRefreshing.value = false
    }
  }

  return { refresh, isRefreshing }
}
