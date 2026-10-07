import type { AuthProfile } from '~/features/auth/types/profile.types'
import { normalizeAppearance, toRelativeApiUrl } from '~/features/auth/utils/profile-appearance.util'
import type { ProfileAppearance } from '~/features/auth/utils/profile-appearance.util'
import type { PaginatedResponse } from '~/shared/types/api.types'

/** Páginas de 100 perfiles; el tope evita un ciclo infinito si el backend repite el cursor. */
const MAX_PAGES = 30
/** Al volver a la pestaña se refresca si el catálogo tiene más de este tiempo. */
const REFRESH_AFTER_MS = 5 * 60 * 1000

/**
 * Carga la imagen y el color de fondo de los perfiles de la organización (`background_image` / `background_color`)
 * para que cualquier círculo de usuario de la app los muestre (ver `UserAvatar`). Si falla, los círculos siguen como siempre.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const session = useAuthSession()
  const catalog = useProfileAppearanceCatalog()
  let loadedAt = 0
  let generation = 0

  async function fetchAll(): Promise<Record<number, ProfileAppearance>> {
    const found: Record<number, ProfileAppearance> = {}
    let nextUrl: string | null = null

    for (let page = 0; page < MAX_PAGES; page++) {
      const response: PaginatedResponse<AuthProfile> = await nuxtApp.$api<PaginatedResponse<AuthProfile>>(
        nextUrl ?? '/api/auth/profiles/',
      )
      for (const profile of response.results) {
        const appearance = normalizeAppearance(profile.background_color, profile.background_image)
        if (appearance) {
          found[profile.id] = appearance
        }
      }
      if (!response.next) {
        break
      }
      nextUrl = toRelativeApiUrl(response.next)
    }

    return found
  }

  async function load() {
    const current = ++generation
    try {
      const found = await fetchAll()
      // Una sesión nueva o un cierre de sesión mientras se pedía descarta esta respuesta.
      if (current === generation) {
        catalog.value = found
        loadedAt = Date.now()
      }
    }
    catch {
      // Sin catálogo los círculos conservan su color e iniciales.
    }
  }

  nuxtApp.hook('app:mounted', () => {
    watch(
      () => session.value?.user.id ?? null,
      (userId) => {
        generation++
        loadedAt = 0
        if (userId == null) {
          catalog.value = {}
          return
        }
        void load()
      },
      { immediate: true },
    )

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && session.value && Date.now() - loadedAt > REFRESH_AFTER_MS) {
        void load()
      }
    })
  })
})
