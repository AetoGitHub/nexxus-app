import { useQueryClient } from '@tanstack/vue-query'

/**
 * Refetch de las queries de tareas activas (listas/kanban/calendar
 * montadas en ese momento) y de los permisos de la plataforma: si un admin
 * cambió, por ejemplo, «Vista por proyecto / por grupo», las opciones
 * aparecen o se ocultan al actualizar, sin salir y volver a entrar.
 */
export function useRefreshTaskWorkspace() {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { refreshPermissions } = usePermissions()
  const isRefreshing = ref(false)

  async function refresh() {
    if (isRefreshing.value) {
      return
    }

    isRefreshing.value = true
    try {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['tasks'],
          type: 'active',
        }),
        refreshPermissions(undefined, { force: true }),
      ])
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
