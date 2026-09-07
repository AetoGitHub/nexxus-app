import { DEFAULT_THEME_COLOR, THEME_COLORS } from '~/features/projects/types/project.types'

/** Resuelve el color de un proyecto (nombre CSS/hex o vacío → fallback). */
export function resolveThemeColor(color: string | null | undefined): string {
  const value = color?.trim()
  if (!value) {
    return DEFAULT_THEME_COLOR
  }
  if (value.startsWith('#')) {
    return value
  }
  const named = THEME_COLORS.find(option => option.name === value)
  return named?.hex ?? value
}

/**
 * Negro o blanco: el que sea legible sobre `hex`, según brillo percibido (YIQ).
 * Evita tener que validar a mano cada combinación de color de fondo elegido
 * por el usuario contra el texto/badges que se dibujan encima.
 */
export function getReadableTextColor(hex: string): '#000000' | '#ffffff' {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) {
    return '#ffffff'
  }

  const value = Number.parseInt(match[1]!, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  return brightness > 150 ? '#000000' : '#ffffff'
}
