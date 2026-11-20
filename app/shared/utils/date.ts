/**
 * Utilidades de fecha reutilizables en todo el proyecto.
 * Devuelven primitivos; el etiquetado i18n (hoy/mañana) se hace en la vista.
 */

/** Zona horaria de negocio: el backend vence cada `limit_date` al final del día en CDMX. */
export const BUSINESS_TIME_ZONE = 'America/Mexico_City'

const BUSINESS_DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Día calendario (YYYY-MM-DD) de un instante en la zona de negocio. No se deben cortar los primeros 10
 * caracteres del ISO: está en UTC y, p. ej., `2026-10-02T05:59:59Z` es el 1 de octubre a las 23:59 en CDMX.
 * Una fecha sin hora (`YYYY-MM-DD`) ya es un día calendario y se devuelve igual.
 */
export function businessDayKey(value?: string | null): string | null {
  if (!value) {
    return null
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = parseDate(value)
  return date ? BUSINESS_DAY_FORMAT.format(date) : null
}

/**
 * Día límite (YYYY-MM-DD, CDMX) de una tarea: `limit_day` del backend; si no viene (respuesta vieja),
 * se calcula desde `limit_date` en CDMX. Nunca cortar `limit_date` (UTC) para mostrar el día.
 */
export function limitDayOf(task: { limit_day?: string | null, limit_date?: string | null }): string | null {
  return task.limit_day ?? businessDayKey(task.limit_date)
}

/** Hoy (YYYY-MM-DD) en la zona de negocio (CDMX). */
export function businessToday(now: Date = new Date()): string {
  return BUSINESS_DAY_FORMAT.format(now)
}

/** Suma días a un YYYY-MM-DD sin pasar por UTC ni por la zona del navegador. */
export function addDaysToDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day! + days))
  return date.toISOString().slice(0, 10)
}

/** Días entre dos YYYY-MM-DD (`dayKey - fromKey`): negativo = pasado, 0 = mismo día. */
export function diffDayKeys(dayKey: string, fromKey: string): number {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split('-').map(Number)
    return Date.UTC(year!, month! - 1, day!)
  }
  return Math.round((toUtc(dayKey) - toUtc(fromKey)) / 86_400_000)
}

/** Fecha corta (20 nov) de un YYYY-MM-DD, construida en local para que no cambie de día. */
export function formatShortDayKey(dayKey: string, locale = 'es'): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(year!, month! - 1, day!))
}

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
