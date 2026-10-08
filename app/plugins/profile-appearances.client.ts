import {
  useProfileAppearanceCatalog,
  useProfileInitialsCatalog,
} from '~/features/auth/composables/useProfileAppearance'
import type { AuthProfile } from '~/features/auth/types/profile.types'
import {
  clearStoredCatalog,
  initialsFromNames,
  normalizeAppearance,
  readStoredCatalog,
  toRelativeApiUrl,
  writeStoredCatalog,
} from '~/features/auth/utils/profile-appearance.util'
import type { StoredProfileCatalog } from '~/features/auth/utils/profile-appearance.util'
import type { PaginatedResponse } from '~/shared/types/api.types'

/** Páginas de 100 perfiles; el tope evita un ciclo infinito si el backend repite el cursor. */
const MAX_PAGES = 30
/** Al volver a la pestaña se refresca si el catálogo tiene más de este tiempo. */
const REFRESH_AFTER_MS = 5 * 60 * 1000

/**
 * Carga de los perfiles de la organización (`GET /api/auth/profiles/`) lo que necesita cualquier círculo de usuario de la
 * app (ver `UserAvatar`): su imagen o color de fondo y sus iniciales reales (nombre y apellido). Se guarda también en el
 * navegador para que, al abrir la app, los círculos salgan bien desde el primer render. Si falla, los círculos siguen como siempre.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const session = useAuthSession()
  const appearances = useProfileAppearanceCatalog()
  const initials = useProfileInitialsCatalog()
  let loadedAt = 0
  let generation = 0

  function apply(catalog: StoredProfileCatalog) {
    appearances.value = catalog.appearances
    initials.value = catalog.initials
  }

  // Primer render: lo último que se guardó de este mismo usuario.
  const stored = readStoredCatalog(session.value?.user.id)
  if (stored) {
    apply(stored)
  }

  async function fetchAll(): Promise<StoredProfileCatalog> {
    const found: StoredProfileCatalog = { appearances: {}, initials: {} }
    let nextUrl: string | null = null

    for (let page = 0; page < MAX_PAGES; page++) {
      const response: PaginatedResponse<AuthProfile> = await nuxtApp.$api<PaginatedResponse<AuthProfile>>(
        nextUrl ?? '/api/auth/profiles/',
      )
      for (const profile of response.results) {
        const appearance = normalizeAppearance(profile.background_color, profile.background_image)
        if (appearance) {
          found.appearances[profile.id] = appearance
        }
        const profileInitials = initialsFromNames(profile.first_name, profile.last_name)
        if (profileInitials) {
          found.initials[profile.id] = profileInitials
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
    const userId = session.value?.user.id
    try {
      const found = await fetchAll()
      // Una sesión nueva o un cierre de sesión mientras se pedía descarta esta respuesta.
      if (current === generation && userId != null) {
        apply(found)
        writeStoredCatalog(userId, found)
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
          apply({ appearances: {}, initials: {} })
          clearStoredCatalog()
          return
        }
        // Otra cuenta: nunca se muestra el catálogo guardado de la anterior.
        const own = readStoredCatalog(userId)
        apply(own ?? { appearances: {}, initials: {} })
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

  // Para refrescar los círculos al instante tras guardar un usuario (`useUpdateUser` / `useCreateUser`).
  return {
    provide: { refreshProfileAppearances: load },
  }
})
