import type { DashboardDateRange, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'

/**
 * Periodos concretos (una semana, un mes, un trimestre o un año del calendario) para el filtro por periodo del Dashboard.
 * Todo trabaja con días `YYYY-MM-DD` y aritmética UTC: son fechas sin hora y no deben pasar por la zona horaria del navegador
 * (`new Date('2026-10-04')` en México daría el 3). El backend recibe cada periodo como rango (`date_start` / `date_end`).
 */

const pad = (value: number) => String(value).padStart(2, '0')

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function utcDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`)
}

function parts(key: string): { year: number, month: number, day: number } {
  const [year, month, day] = key.split('-').map(Number)
  return { year: year!, month: month!, day: day! }
}

export function addDays(key: string, days: number): string {
  const date = utcDate(key)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Semana de domingo a sábado que contiene el día (igual que el backend). */
export function weekRangeOf(key: string): DashboardDateRange {
  const start = addDays(key, -utcDate(key).getUTCDay())
  return { start, end: addDays(start, 6) }
}

export function monthRange(year: number, month: number): DashboardDateRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: dayKey(year, month, 1), end: dayKey(year, month, lastDay) }
}

export function quarterRange(year: number, quarter: number): DashboardDateRange {
  const firstMonth = (quarter - 1) * 3 + 1
  return { start: dayKey(year, firstMonth, 1), end: monthRange(year, firstMonth + 2).end }
}

export function yearRange(year: number): DashboardDateRange {
  return { start: dayKey(year, 1, 1), end: dayKey(year, 12, 31) }
}

export function isSameRange(a: DashboardDateRange | null | undefined, b: DashboardDateRange | null | undefined): boolean {
  return !!a && !!b && a.start === b.start && a.end === b.end
}

/** Periodo actual (el que contiene a `today`) de cada tipo. */
export function currentRangeOf(period: DashboardPeriod, today: string): DashboardDateRange {
  const { year, month } = parts(today)
  switch (period) {
    case 'week':
      return weekRangeOf(today)
    case 'month':
      return monthRange(year, month)
    case 'quarter':
      return quarterRange(year, Math.ceil(month / 3))
    default:
      return yearRange(year)
  }
}

export interface PeriodOption {
  /** Identifica la opción en la lista. */
  id: string
  year: number
  /** 1-12 en meses; 1-4 en trimestres; ausente en años. */
  index?: number
  range: DashboardDateRange
  /** Es el periodo en curso (elegirlo equivale a no filtrar). */
  current: boolean
}

/** Periodos anteriores de un tipo, del actual hacia atrás: 12 meses, 8 trimestres o 6 años. */
export function periodOptions(period: Exclude<DashboardPeriod, 'week'>, today: string): PeriodOption[] {
  const { year, month } = parts(today)

  if (period === 'month') {
    return Array.from({ length: 12 }, (_, offset) => {
      const index = month - offset
      const optionYear = year + Math.floor((index - 1) / 12)
      const optionMonth = ((index - 1) % 12 + 12) % 12 + 1
      return {
        id: `month-${optionYear}-${optionMonth}`,
        year: optionYear,
        index: optionMonth,
        range: monthRange(optionYear, optionMonth),
        current: offset === 0,
      }
    })
  }

  if (period === 'quarter') {
    const currentQuarter = Math.ceil(month / 3)
    return Array.from({ length: 8 }, (_, offset) => {
      const index = currentQuarter - offset
      const optionYear = year + Math.floor((index - 1) / 4)
      const optionQuarter = ((index - 1) % 4 + 4) % 4 + 1
      return {
        id: `quarter-${optionYear}-${optionQuarter}`,
        year: optionYear,
        index: optionQuarter,
        range: quarterRange(optionYear, optionQuarter),
        current: offset === 0,
      }
    })
  }

  return Array.from({ length: 6 }, (_, offset) => ({
    id: `year-${year - offset}`,
    year: year - offset,
    range: yearRange(year - offset),
    current: offset === 0,
  }))
}

/** Un día `YYYY-MM-DD` formateado sin que la zona horaria lo corra de día. */
export function formatDayKey(key: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(utcDate(key))
}

/** `4–10 oct 2026`, `27 sep – 3 oct 2026`: el rango de una semana en el idioma activo. */
export function formatWeekRange(range: DashboardDateRange, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .formatRange(utcDate(range.start), utcDate(range.end))
}
