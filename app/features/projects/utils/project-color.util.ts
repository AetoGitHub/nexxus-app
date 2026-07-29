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
