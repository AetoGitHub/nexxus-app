import { FetchError } from 'ofetch'

/** Lo que tarda en vencer la clave que manda n8n (lo define el backend). */
export const PASSWORD_RESET_CODE_TTL_MS = 5 * 60_000
/** Espera entre un envío de clave y el siguiente «Reenviar clave». */
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 30_000

/** Respuesta de `GET password/reset/lookup/`: el correo viene ENMASCARADO (`h***@gmail.com`). */
export interface PasswordResetLookupResponse {
  username: string
  email: string
}

/** Solo el usuario: el correo destino lo toma el backend del perfil (el front nunca lo escribe ni lo ve completo). */
export interface PasswordResetRequest {
  username: string
}

export interface PasswordResetConfirmRequest extends PasswordResetRequest {
  code: string
  new_password: string
  new_password2: string
}

/**
 * Por qué falló el cambio de contraseña:
 * - `code`: la clave ya no sirve (un solo intento, vencida o ya usada). Hay que pedir otra.
 * - `password`: lo rechazaron los validadores de contraseña; la clave NO se gastó y se puede reintentar.
 * - `throttled`: 429, demasiados intentos.
 * - `other`: red, 5xx u otro.
 */
export type PasswordResetErrorKind = 'code' | 'password' | 'throttled' | 'other'

/**
 * `hmoralesventura97@gmail.com` → `h***@gmail.com`. Lo único que se pinta en pantalla: el correo completo solo se
 * guarda en memoria para mandarlo a n8n. Si ya viene enmascarado se deja igual.
 */
export function maskEmail(email: string): string {
  const value = email.trim()
  if (value.includes('*')) {
    return value
  }
  const [local = '', domain = ''] = value.split('@')
  return domain ? `${local.charAt(0)}***@${domain}` : '***'
}

/** Status HTTP de un error de `$fetch` (undefined si fue de red). */
export function fetchErrorStatus(error: unknown): number | undefined {
  return error instanceof FetchError ? error.response?.status : undefined
}

/** Clasifica el error de `password/reset/confirm/` con el texto que manda el backend (ya en español). */
export function classifyPasswordResetError(error: unknown): { kind: PasswordResetErrorKind, message: string } {
  const message = parseFetchError(error)
  const status = fetchErrorStatus(error)
  if (status === 429) {
    return { kind: 'throttled', message }
  }
  if (status === 400) {
    // El mismo mensaje cubre usuario incorrecto, clave equivocada, vencida o usada (a propósito).
    return { kind: /c[oó]digo|clave|code/i.test(message) ? 'code' : 'password', message }
  }
  return { kind: 'other', message }
}

/**
 * «¿Olvidaste tu contraseña?». Ninguna llamada usa sesión: se usa `$fetch` directo (no `$api`) para no mandar el
 * header Authorization.
 */
export function usePasswordReset() {
  const apiBaseUrl = useApiBaseUrl()
  const { public: { n8nPasswordResetUrl } } = useRuntimeConfig()

  /** Paso 1: busca UN usuario por username (sin distinguir mayúsculas). 404 si no existe o no tiene correo. */
  async function lookupUser(username: string): Promise<PasswordResetLookupResponse> {
    return await $fetch<PasswordResetLookupResponse>('/api/auth/password/reset/lookup/', {
      baseURL: apiBaseUrl,
      method: 'GET',
      query: { username: username.trim() },
    })
  }

  /** Paso 1 (n8n): siempre responde 200 con el mismo mensaje. Recibe el usuario y el correo que dio el lookup. */
  async function requestCode(body: PasswordResetRequest & { email: string }): Promise<string | null> {
    const response = await $fetch<{ detail?: string }>(n8nPasswordResetUrl as string, {
      method: 'POST',
      body: { username: body.username.trim(), email: body.email.trim() },
    })
    return typeof response?.detail === 'string' ? response.detail : null
  }

  /** Paso 2 (Nexxus): cambia la contraseña con la clave. */
  async function confirmReset(body: PasswordResetConfirmRequest): Promise<string | null> {
    const response = await $fetch<{ detail?: string }>('/api/auth/password/reset/confirm/', {
      baseURL: apiBaseUrl,
      method: 'POST',
      body: { ...body, username: body.username.trim() },
    })
    return typeof response?.detail === 'string' ? response.detail : null
  }

  return { lookupUser, requestCode, confirmReset }
}
