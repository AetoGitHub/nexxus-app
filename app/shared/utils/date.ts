/**
 * Utilidades de fecha reutilizables en todo el proyecto.
 * Devuelven primitivos; el etiquetado i18n (hoy/mañana) se hace en la vista.
 */

export function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Diferencia en días completos entre `value` y `from` (por defecto hoy).
 * Negativo = pasado, 0 = hoy, positivo = futuro. `null` si no hay fecha.
 */
export function diffInDays(value?: string | null, from: Date = new Date()): number | null {
  const date = parseDate(value)
  if (!date) {
    return null
  }
  const ms = startOfDay(date).getTime() - startOfDay(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatShortDate(value?: string | null, locale = 'es'): string {
  const date = parseDate(value)
  if (!date) {
    return ''
  }
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date)
}

export function formatDateTime(value?: string | null, locale = 'es'): string {
  const date = parseDate(value)
  if (!date) {
    return ''
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Tiempo relativo compacto para previews (hace 5 min, ayer…). */
export function formatRelativeTime(value?: string | null, locale = 'es'): string {
  const date = parseDate(value)
  if (!date) {
    return ''
  }

  const diffMs = date.getTime() - Date.now()
  const absSec = Math.round(Math.abs(diffMs) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (absSec < 60) {
    return rtf.format(Math.round(diffMs / 1000), 'second')
  }
  if (absSec < 3600) {
    return rtf.format(Math.round(diffMs / 60_000), 'minute')
  }
  if (absSec < 86_400) {
    return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
  }
  if (absSec < 86_400 * 7) {
    return rtf.format(Math.round(diffMs / 86_400_000), 'day')
  }

  return formatShortDate(value, locale)
}
