import type { MaybeRefOrGetter } from 'vue'
import { normalizeAppearance } from '~/features/auth/utils/profile-appearance.util'
import type { ProfileAppearance } from '~/features/auth/utils/profile-appearance.util'

/**
 * Catálogo `id de usuario -> apariencia` (imagen o color de fondo) de la sesión. Solo guarda a quien tiene alguna.
 * Lo llena el plugin `profile-appearances.client` con `GET /api/auth/profiles/`.
 */
export function useProfileAppearanceCatalog() {
  return useState<Record<number, ProfileAppearance>>('profile-appearances', () => ({}))
}

/** Catálogo `id de usuario -> iniciales reales` (nombre y apellido). Solo guarda a quien tiene nombre. */
export function useProfileInitialsCatalog() {
  return useState<Record<number, string>>('profile-initials', () => ({}))
}

/** Iniciales reales de un usuario (p. ej. `GF`) o `null` si aún no se conocen o no tiene nombre. */
export function useProfileInitials(userId: MaybeRefOrGetter<number | null | undefined>) {
  const catalog = useProfileInitialsCatalog()

  return computed<string | null>(() => {
    const id = toValue(userId)
    return id == null ? null : (catalog.value[id] ?? null)
  })
}

/**
 * Apariencia de un usuario o `null` si no tiene imagen ni color (el círculo se queda con su color e iniciales de siempre).
 * El perfil propio usa primero la configuración de la sesión, que se actualiza al guardarla sin esperar al catálogo.
 */
export function useProfileAppearance(userId: MaybeRefOrGetter<number | null | undefined>) {
  const catalog = useProfileAppearanceCatalog()
  const session = useAuthSession()

  return computed<ProfileAppearance | null>(() => {
    const id = toValue(userId)
    if (id == null) {
      return null
    }

    const config = session.value?.profile_configurations
    if (session.value?.user.id === id && config && (config.background_color !== undefined || config.background_image !== undefined)) {
      return normalizeAppearance(config.background_color, config.background_image)
    }

    return catalog.value[id] ?? null
  })
}
