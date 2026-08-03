import type { AuthSession } from '~/shared/types/auth.types'

/**
 * Cliente HTTP autenticado del backend, disponible como `$api`.
 *
 * - `baseURL` desde runtimeConfig (`apiBaseUrl`).
 * - Agrega `Authorization: Token <token>` de la sesión en cada request.
 * - Envía `Accept-Language` según el locale activo (mensajes de sistema, etc.).
 *
 * @example
 * const { $api } = useNuxtApp()
 * const data = await $api<Project[]>('/api/projects/')
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { public: { apiBaseUrl } } = useRuntimeConfig()
  const session = useCookie<AuthSession | null>('auth_session')

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
  })

  return {
    provide: { api },
  }
})
