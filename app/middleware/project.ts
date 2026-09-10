/**
 * Route guard for pages scoped to one of the user's `projects` (from login).
 *
 * Opt in per-page with:
 *   definePageMeta({ middleware: ['auth', 'project'] })
 *
 * On `/tasks/project/:projectId`, also confirms the id belongs to the
 * user's `projects` (no navegar a un proyecto ajeno cambiando la URL).
 */
export default defineNuxtRouteMiddleware((to) => {
  const { userProjects } = useAuth()

  if (!userProjects.value.length) {
    return navigateTo('/tasks')
  }

  const rawProjectId = to.params.projectId
  if (rawProjectId == null) {
    return
  }

  const projectId = Number(rawProjectId)
  if (!userProjects.value.some(project => project.id === projectId)) {
    return navigateTo('/tasks')
  }
})
