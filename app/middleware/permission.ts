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

  const { isLoaded, can, refreshPermissions } = usePermissions()
  if (!isLoaded.value) {
    await refreshPermissions()
  }

  const pairs = isPairList(required) ? required : [required]
  const allowed = pairs.some(([module, action]) => can(module, action as never))
  if (allowed) {
    return
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
