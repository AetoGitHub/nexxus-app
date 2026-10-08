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

/**
 * Iniciales reales de una persona: inicial del nombre y del apellido (`Guillermo` + `Franco Borjón` -> `GF`). Con un solo
 * nombre y sin apellido, sus dos primeras letras (`Kevin` -> `KE`). `null` si no tiene nombre ni apellido: quien llama
 * decide el respaldo (p. ej. el username).
 */
export function initialsFromNames(firstName: string | null | undefined, lastName: string | null | undefined): string | null {
  const words = (value: string | null | undefined) => (value ?? '').trim().split(/\s+/).filter(Boolean)
  const first = words(firstName)
  const last = words(lastName)

  const given = first[0]
  const family = last[0] ?? first[1]
  if (given && family) {
    return (given.charAt(0) + family.charAt(0)).toLocaleUpperCase()
  }

  const single = given ?? family
  return single ? single.slice(0, 2).toLocaleUpperCase() : null
}

/** Nombre a mostrar de una persona: nombre y apellidos; si no los tiene, su username. */
export function profileFullName(profile: { first_name?: string | null, last_name?: string | null, username: string }): string {
  const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim().replace(/\s+/g, ' ')
  return fullName || profile.username
}

/** Catálogo de perfiles de la sesión que se guarda en el navegador para pintar los círculos bien desde el primer render. */
export interface StoredProfileCatalog {
  appearances: Record<number, ProfileAppearance>
  initials: Record<number, string>
}

const CATALOG_STORAGE_KEY = 'nexxus.profile-catalog'

/** Solo se lee si es del mismo usuario que tiene la sesión: nunca se muestra el catálogo de otra cuenta. */
export function readStoredCatalog(userId: number | null | undefined): StoredProfileCatalog | null {
  if (userId == null) {
    return null
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) ?? 'null') as
      { userId?: number, appearances?: Record<number, ProfileAppearance>, initials?: Record<number, string> } | null
    if (parsed?.userId !== userId) {
      return null
    }
    return { appearances: parsed.appearances ?? {}, initials: parsed.initials ?? {} }
  }
  catch {
    return null
  }
}

export function writeStoredCatalog(userId: number, catalog: StoredProfileCatalog) {
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ userId, ...catalog }))
  }
  catch {
    // Sin almacenamiento los círculos solo tardan un instante más en tener sus datos.
  }
}

export function clearStoredCatalog() {
  try {
    localStorage.removeItem(CATALOG_STORAGE_KEY)
  }
  catch {
    // Nada que limpiar.
  }
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
