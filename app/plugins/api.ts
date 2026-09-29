/**
 * Cliente HTTP autenticado del backend, disponible como `$api`.
 *
 * - `baseURL` desde runtimeConfig (`apiBaseUrl`).
 * - Agrega `Authorization: Token <token>` de la sesión en cada request.
 * - Envía `Accept-Language` según el locale activo (mensajes de sistema, etc.).
 * - Si el backend responde 401 con el token de la sesión vigente (p. ej. se cerró
 *   sesión en otro dispositivo), cierra la sesión local y manda al login.
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
    onResponseError({ response, options }) {
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
