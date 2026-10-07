/** Cómo se ve un usuario en su círculo: imagen o color de fondo del perfil (`ProfileConfig` del backend). */
export interface ProfileAppearance {
  color: string | null
  image: string | null
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const IMAGE_URL = /^https?:\/\//i

/**
 * Normaliza lo que manda el backend (`''`, `null` o ausente = sin valor). Solo acepta un color hex y una URL http(s);
 * si no trae ninguno de los dos devuelve `null` y el círculo se queda como siempre.
 */
export function normalizeAppearance(
  color: string | null | undefined,
  image: string | null | undefined,
): ProfileAppearance | null {
  const cleanColor = color?.trim() ?? ''
  const cleanImage = image?.trim() ?? ''

  const normalized: ProfileAppearance = {
    color: HEX_COLOR.test(cleanColor) ? cleanColor : null,
    image: IMAGE_URL.test(cleanImage) ? cleanImage : null,
  }

  return normalized.color || normalized.image ? normalized : null
}

/** Texto negro o blanco, el que mejor se lea sobre un fondo hex (luminancia relativa). */
export function readableTextColor(hex: string): string {
  const digits = hex.replace('#', '')
  const full = digits.length === 3 ? digits.split('').map(char => char + char).join('') : digits
  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(full.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  return luminance > 0.5 ? '#111827' : '#ffffff'
}

/** `https://host/api/...?cursor=x` -> `/api/...?cursor=x` (el cliente HTTP ya trae la base). */
export function toRelativeApiUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.pathname}${parsedUrl.search}`
  }
  catch {
    return url
  }
}
