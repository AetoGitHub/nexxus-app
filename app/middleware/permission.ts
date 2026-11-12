import type { PermissionActions, PermissionModule } from '~/shared/types/auth.types'

/** `['master']` (solo el módulo) o `['task', 'view']` (módulo + acción). */
type PermissionPair = { [M in PermissionModule]: [M] | [M, PermissionActions[M]] }[PermissionModule]

declare module '#app' {
  interface PageMeta {
    /** Permiso que pide la página; con varios pares basta con cualquiera. */
    permission?: PermissionPair | PermissionPair[]
  }
}

function isPairList(value: PermissionPair | PermissionPair[]): value is PermissionPair[] {
  return Array.isArray(value[0])
}

/**
 * Bloquea las páginas sin permiso:
 *   definePageMeta({ middleware: ['auth', 'permission'], permission: ['task', 'view'] })
 * Sin permiso se avisa y se manda al inicio (`/`), que nunca está bloqueado.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const required = to.meta.permission
  if (!required) {
    return
  }

  // Los permisos de la pantalla ya los pidió `permissions-screen` (global, corre antes); esto es solo respaldo.
  const { isLoaded, can, activeScreen, refreshPermissions } = usePermissions()
  if (!isLoaded.value) {
    await refreshPermissions()
  }

  const pairs = isPairList(required) ? required : [required]
  const allowed = pairs.some(([module, action]) => can(module, action as never))
  if (allowed) {
    return
  }

  // En Nexxus Tasks, sin la página pedida pero con otra del módulo (p. ej. sin tareas pero con reportes): se lleva a la
  // primera que sí puede ver en vez de sacarlo al hub. Sin aviso: entró desde la tarjeta del hub.
  if (activeScreen.value === 'task') {
    const fallback = [
      { path: '/tasks', allowed: can('task', 'view') },
      { path: '/reporte-ceo', allowed: can('report', 'view') },
      { path: '/dashboard', allowed: can('dashboard', 'view') },
    ].find(entry => entry.allowed && entry.path !== to.path)
    if (fallback && to.path === '/tasks') {
      return navigateTo(fallback.path)
    }
  }

  if (import.meta.client) {
    const t = useNuxtApp().$i18n.t
    const [module] = pairs[0]!
    useToast().add({
      title: t('permissions.denied.title'),
      description: t('permissions.denied.description', { module: t(`permissions.modules.${module}`) }),
      color: 'error',
      icon: 'i-lucide-lock',
    })
  }
  return navigateTo('/')
})
