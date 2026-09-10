/**
 * Route guard for group-manager-only pages.
 *
 * Opt in per-page with:
 *   definePageMeta({ middleware: ['auth', 'group'] })
 *
 * On `/tasks/group/:groupId`, also confirms the id belongs to one of the
 * user's `managed_groups` (no navegar a un grupo ajeno cambiando la URL).
 */
export default defineNuxtRouteMiddleware((to) => {
  const { managedGroups } = useAuth()

  if (!managedGroups.value.length) {
    return navigateTo('/tasks')
  }

  const rawGroupId = to.params.groupId
  if (rawGroupId == null) {
    return
  }

  const groupId = Number(rawGroupId)
  if (!managedGroups.value.some(group => group.id === groupId)) {
    return navigateTo('/tasks')
  }
})
