import type { AuthSession } from '~/shared/types/auth.types'

/** Llave de localStorage donde vive la sesión (persiste entre cierres del navegador/PWA). */
export const AUTH_SESSION_STORAGE_KEY = 'nexxus:auth-session'

/** Cookie de sesión anterior (sin expiración, se perdía al cerrar el navegador). */
const LEGACY_SESSION_COOKIE = 'auth_session'

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<AuthSession>
  return typeof candidate.token === 'string'
    && candidate.token.length > 0
    && typeof candidate.user === 'object'
    && candidate.user !== null
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isAuthSession(parsed) ? parsed : null
  }
  catch {
    return null
  }
}

function readLegacyCookie(): AuthSession | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LEGACY_SESSION_COOKIE}=([^;]*)`))
  if (!match?.[1]) {
    return null
  }
  try {
    return parseSession(decodeURIComponent(match[1]))
  }
  catch {
    return null
  }
}

function removeLegacyCookie() {
  document.cookie = `${LEGACY_SESSION_COOKIE}=; Max-Age=0; path=/`
}

/** Sesión guardada en el navegador, o `null` si no hay o es inválida. */
export function readStoredSession(): AuthSession | null {
  if (!import.meta.client) {
    return null
  }

  try {
    const stored = parseSession(localStorage.getItem(AUTH_SESSION_STORAGE_KEY))
    if (stored) {
      return stored
    }
  }
  catch {
    // Storage bloqueado (modo privado, política del navegador): se intenta la cookie.
  }

  // Migración: quien ya tenía sesión en la cookie anterior no debe volver a iniciar sesión.
  const legacy = readLegacyCookie()
  if (legacy) {
    writeStoredSession(legacy)
    removeLegacyCookie()
  }
  return legacy
}

/** Guarda (o borra con `null`) la sesión. Devuelve `false` si el navegador no permitió escribir. */
export function writeStoredSession(session: AuthSession | null): boolean {
  if (!import.meta.client) {
    return false
  }

  try {
    if (session) {
      const serialized = JSON.stringify(session)
      if (localStorage.getItem(AUTH_SESSION_STORAGE_KEY) !== serialized) {
        localStorage.setItem(AUTH_SESSION_STORAGE_KEY, serialized)
      }
    }
    else {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    }
    return true
  }
  catch {
    return false
  }
}

/** Lee la sesión desde el valor crudo de un evento `storage`. */
export function parseStoredSession(raw: string | null): AuthSession | null {
  return parseSession(raw)
}
