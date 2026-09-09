/**
 * Route guard for superuser-only pages.
 *
 * Opt in per-page with:
 *   definePageMeta({ middleware: ['auth', 'admin'] })
 */
export default defineNuxtRouteMiddleware(() => {
  const { isSuperuser } = useAuth()

  if (!isSuperuser.value) {
    return navigateTo('/tasks')
  }
})
