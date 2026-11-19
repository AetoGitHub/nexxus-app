/**
 * Guarda de la "Vista total" (/tasks/admin): superuser o permiso `task.can_view_all`.
 *
 *   definePageMeta({ middleware: ['auth', 'admin'] })
 */
export default defineNuxtRouteMiddleware(() => {
  const { can } = usePermissions()

  if (!can('task', 'view_all')) {
    return navigateTo('/tasks')
  }
})
