import { FetchError } from 'ofetch'

/** Lo que tarda en vencer el código que manda n8n (lo define el backend). */
export const PASSWORD_RESET_CODE_TTL_MS = 5 * 60_000
/** Espera entre un envío de código y el siguiente «Reenviar código». */
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 30_000

export interface PasswordResetRequest {
  username: string
  email: string
}

export interface PasswordResetConfirmRequest extends PasswordResetRequest {
  code: string
  new_password: string
  new_password2: string
}

/**
 * Por qué falló el cambio de contraseña:
 * - `code`: el código ya no sirve (un solo intento, vencido o ya usado). Hay que pedir otro.
 * - `password`: lo rechazaron los validadores de contraseña; el código NO se gastó y se puede reintentar.
 * - `throttled`: 429, demasiados intentos.
 * - `other`: red, 5xx u otro.
 */
export type PasswordResetErrorKind = 'code' | 'password' | 'throttled' | 'other'

/** Clasifica el error de `password/reset/confirm/` con el texto que manda el backend (ya en español). */
export function classifyPasswordResetError(error: unknown): { kind: PasswordResetErrorKind, message: string } {
  const message = parseFetchError(error)
  const status = error instanceof FetchError ? error.response?.status : undefined
  if (status === 429) {
    return { kind: 'throttled', message }
  }
  if (status === 400) {
    // El mismo mensaje cubre usuario/correo incorrecto, código equivocado, vencido o usado (a propósito).
    return { kind: /c[oó]digo|code/i.test(message) ? 'code' : 'password', message }
  }
  return { kind: 'other', message }
}

/** `hector@gmail.com` → `h***@gmail.com`. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().split('@')
  if (!domain) {
    return email
  }
  return `${local.charAt(0)}***@${domain}`
}

/**
 * «¿Olvidaste tu contraseña?». Ninguna llamada usa sesión: se usa `$fetch` directo (no `$api`) para no mandar el
 * header Authorization.
 */
export function usePasswordReset() {
  const apiBaseUrl = useApiBaseUrl()
  const { public: { n8nPasswordResetUrl } } = useRuntimeConfig()

  /** Paso 1 (n8n): siempre responde 200 con el mismo mensaje, exista o no el usuario. */
  async function requestCode(body: PasswordResetRequest): Promise<string | null> {
    const response = await $fetch<{ detail?: string }>(n8nPasswordResetUrl as string, {
      method: 'POST',
      body: { username: body.username.trim(), email: body.email.trim() },
    })
    return typeof response?.detail === 'string' ? response.detail : null
  }

  /** Paso 2 (Nexxus): cambia la contraseña con el código. */
  async function confirmReset(body: PasswordResetConfirmRequest): Promise<string | null> {
    const response = await $fetch<{ detail?: string }>('/api/auth/password/reset/confirm/', {
      baseURL: apiBaseUrl,
      method: 'POST',
      body: { ...body, username: body.username.trim(), email: body.email.trim() },
    })
    return typeof response?.detail === 'string' ? response.detail : null
  }

  return { requestCode, confirmReset }
}
