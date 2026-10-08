/** Colores sugeridos para el fondo del círculo del usuario (los mismos tonos que usan los avatares de tareas). */
export const USER_COLOR_PRESETS = [
  '#f59e0b',
  '#28ceab',
  '#4c6ef5',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#db2777',
  '#65a30d',
] as const

/** Peso máximo de la foto de perfil. */
export const USER_IMAGE_MAX_BYTES = 5 * 1024 * 1024

/** `background_image` del backend es un `CharField(max_length=512)`. */
export const USER_IMAGE_URL_MAX_LENGTH = 512

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Color para el backend: `#rrggbb` en minúsculas (`background_color` es `max_length=7` y no valida el formato, así que
 * se valida aquí). `#abc` se expande a `#aabbcc`. Un valor vacío o inválido da `''`, que en el backend significa «sin color».
 */
export function normalizeUserColor(value: string | null | undefined): string {
  const color = (value ?? '').trim()
  if (!HEX_COLOR.test(color)) {
    return ''
  }
  const digits = color.slice(1).toLowerCase()
  const full = digits.length === 3 ? digits.split('').map(char => char + char).join('') : digits
  return `#${full}`
}

export type UserImageFileError = 'type' | 'size'

/** `null` si el archivo sirve como foto de perfil. */
export function validateUserImageFile(file: File): UserImageFileError | null {
  if (!file.type.startsWith('image/')) {
    return 'type'
  }
  return file.size > USER_IMAGE_MAX_BYTES ? 'size' : null
}

/** Directorio de Storage de las fotos de perfil: erp/users/{organization_id}/avatars */
export function buildUserImageDirectory(organizationId: number): string {
  return `erp/users/${organizationId}/avatars`
}

/** Nombre final del archivo: {timestamp_ms}_{nombre_original} (el timestamp evita choques entre archivos con el mismo nombre). */
export function buildUserImageFileName(originalName: string): string {
  return `${Date.now()}_${originalName}`
}
