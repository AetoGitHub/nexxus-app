/**
 * Con contraseña temporal (`must_change_password`) el backend bloquea toda la API menos el cambio de contraseña, así
 * que la app solo deja entrar a esa pantalla hasta que se cambie. Corre en todas las rutas, antes del guard `auth`.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { mustChangePassword } = useAuth()

  if (!mustChangePassword.value || to.path === '/change-password') {
    return
  }

  return navigateTo({
    path: '/change-password',
    query: to.path === '/login' || to.path === '/' ? undefined : { redirect: to.fullPath },
  })
})
