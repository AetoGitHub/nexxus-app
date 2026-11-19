/**
 * Cliente HTTP autenticado del backend, disponible como `$api`.
 *
 * - `baseURL` desde runtimeConfig (`apiBaseUrl`).
 * - Agrega `Authorization: Token <token>` de la sesión en cada request.
 * - Envía `Accept-Language` según el locale activo (mensajes de sistema, etc.).
 * - Si el backend responde 401 con el token de la sesión vigente (p. ej. se cerró
 *   sesión en otro dispositivo), cierra la sesión local y manda al login.
 * - Si responde 403 `{"detail": "must_change_password"}` (contraseña temporal sin cambiar),
 *   marca la sesión y manda a la pantalla de cambio de contraseña.
 *
 * @example
 * const { $api } = useNuxtApp()
 * const data = await $api<Project[]>('/api/projects/')
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { public: { apiBaseUrl } } = useRuntimeConfig()
  const session = useAuthSession()
  let expiring = false

  async function expireSession() {
    if (expiring) {
      return
    }
    expiring = true

    try {
      await nuxtApp.runWithContext(async () => {
        const router = useRouter()
        const current = router.currentRoute.value
        session.value = null

        if (current.path === '/login') {
          return
        }
        await navigateTo({
          path: '/login',
          query: { reason: 'expired', redirect: current.fullPath },
        })
        nuxtApp.$queryClient.clear()
      })
    }
    finally {
      expiring = false
    }
  }

  async function requirePasswordChange() {
    await nuxtApp.runWithContext(async () => {
      const current = useRouter().currentRoute.value
      const { setMustChangePassword } = useAuth()
      setMustChangePassword(true)

      if (current.path === '/change-password' || current.path === '/login') {
        return
      }
      await navigateTo({ path: '/change-password', query: { redirect: current.fullPath } })
    })
  }

  /** Endpoints de las vistas por proyecto / por grupo (`/project/…`, `/group/…`). */
  const GROUP_VIEW_ENDPOINT = /\/api\/tasks\/company\/\d+\/(?:project|group)\//
  /** Último aviso de 403 mostrado: varias consultas que fallan juntas muestran un solo toast. */
  let lastForbiddenToast = { text: '', at: 0 }

  function notifyForbidden(detail: unknown) {
    const text = typeof detail === 'string' && detail.trim() ? detail : 'No tienes permisos para realizar esta acción.'
    const now = Date.now()
    if (lastForbiddenToast.text === text && now - lastForbiddenToast.at < 3000) {
      return
    }
    lastForbiddenToast = { text, at: now }
    useToast().add({ title: text, color: 'error', icon: 'i-lucide-lock' })
  }

  const api = $fetch.create({
    baseURL: apiBaseUrl as string,
    onRequest({ options }) {
      options.headers = new Headers(options.headers)

      const token = session.value?.token
      if (token) {
        options.headers.set('Authorization', `Token ${token}`)
      }

      const locale = unref(nuxtApp.$i18n?.locale)
      if (locale) {
        options.headers.set('Accept-Language', String(locale))
      }
    },
    onResponseError({ request, response, options }) {
      if (response.status === 403 && (response._data as { detail?: unknown } | undefined)?.detail === 'must_change_password') {
        void requirePasswordChange()
        return
      }
      // Un 403 de permisos: los del front pudieron quedar viejos (los cambió un admin). Se vuelven a pedir para que la UI
      // oculte lo que ya no puede hacer; el toast con el `detail` lo pone quien hizo la llamada (parseFetchError).
      if (response.status === 403 && !String(request).includes('/api/auth/permissions/me/')) {
        // Vistas «por proyecto / por grupo» (consultas, sin toast propio): se avisa con el `detail` del backend. Al
        // refrescar los permisos, el workspace cae solo a la vista por defecto (useTaskGroupByAccess).
        if (GROUP_VIEW_ENDPOINT.test(String(request))) {
          notifyForbidden((response._data as { detail?: unknown } | undefined)?.detail)
        }
        void usePermissions().refreshPermissions(undefined, { force: true })
        return
      }
      if (response.status !== 401) {
        return
      }

      // Solo si el 401 corresponde a la sesión vigente: una respuesta tardía de una
      // sesión anterior no debe cerrar la que se acaba de abrir.
      const sentAuthorization = new Headers(options.headers).get('Authorization')
      const currentToken = session.value?.token
      if (currentToken && sentAuthorization === `Token ${currentToken}`) {
        void expireSession()
      }
    },
  })

  return {
    provide: { api },
  }
})
