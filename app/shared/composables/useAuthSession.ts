import type { AuthSession } from '~/shared/types/auth.types'

/**
 * Sesión autenticada compartida por toda la app.
 *
 * Se hidrata de localStorage (con migración de la cookie anterior) y el plugin
 * `auth-session.client` la persiste en cada cambio y la sincroniza entre pestañas.
 */
export function useAuthSession() {
  return useState<AuthSession | null>('auth-session', () => readStoredSession())
}
