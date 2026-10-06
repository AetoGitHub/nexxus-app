import type { ApiLoadStatus, ApiRange } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'

/**
 * Clases por semáforo. Van completas (no se arman con template strings) para que Tailwind las detecte.
 * El teal de marca usa `aeto-teal-dark` en el texto: en claro es más oscuro y mantiene el contraste.
 */
export const TONE_TEXT: Record<DashboardTone, string> = {
  neutral: 'text-foreground',
  excellent: 'text-green-600 dark:text-green-500',
  good: 'text-aeto-teal-dark',
  warning: 'text-amber-600 dark:text-amber-500',
  danger: 'text-red-600 dark:text-red-500',
}

/** Fondo suave + texto (chips y badges). */
export const TONE_SOFT: Record<DashboardTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  excellent: 'bg-green-600/15 text-green-700 dark:text-green-400',
  good: 'bg-aeto-teal/15 text-aeto-teal-dark',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  danger: 'bg-red-600/15 text-red-700 dark:text-red-400',
}

/** Borde superior de acento de las tarjetas de KPI. */
export const TONE_TOP_BORDER: Record<DashboardTone, string> = {
  neutral: 'border-t-aeto-teal',
  excellent: 'border-t-green-600',
  good: 'border-t-aeto-teal',
  warning: 'border-t-amber-500',
  danger: 'border-t-red-600',
}

/** Relleno de barras. */
export const TONE_BG: Record<DashboardTone, string> = {
  neutral: 'bg-muted-foreground',
  excellent: 'bg-green-600',
  good: 'bg-aeto-teal',
  warning: 'bg-amber-500',
  danger: 'bg-red-600',
}

/** Color de línea de las gráficas SVG. */
export const TONE_STROKE: Record<DashboardTone, string> = {
  neutral: '#9aa1ac',
  excellent: '#16a34a',
  good: '#28ceab',
  warning: '#d99a0b',
  danger: '#dc2626',
}

/** Tono de cada rango de desempeño que devuelve el backend (`regular` = ámbar, `critical` = rojo). */
export const RANGE_TONE: Record<ApiRange, DashboardTone> = {
  excellent: 'excellent',
  good: 'good',
  regular: 'warning',
  critical: 'danger',
}

/** Tono del estado de la carga pendiente: disponible, en el límite o saturado. */
export const LOAD_STATUS_TONE: Record<ApiLoadStatus, DashboardTone> = {
  available: 'good',
  at_limit: 'warning',
  saturated: 'danger',
}

/** Texto cuando un valor no tiene datos: nunca se pinta como 0. */
export const NO_DATA = '—'

/**
 * Tono de un porcentaje de desempeño (TCT, TC, IUR, ICA): ≥85 excelente, 70-84.9 bueno, 55-69.9 regular, <55 crítico.
 * Son los mismos umbrales que `ranges` de `load_distribution`. Sin datos no juzga.
 */
export function rangeOf(value: number | null | undefined): DashboardTone {
  if (value == null) {
    return 'neutral'
  }
  if (value >= 85) {
    return 'excellent'
  }
  if (value >= 70) {
    return 'good'
  }
  if (value >= 55) {
    return 'warning'
  }
  return 'danger'
}

/** Redondea a `decimals` y quita los ceros sobrantes (`2.0` → `2`). El `+ 0` evita el `-0`. */
function trimNumber(value: number, decimals = 1): number {
  return Number(value.toFixed(decimals)) + 0
}

/** `83%`: porcentaje de 0 a 100, redondeado. Sin datos, `—`. */
export function formatPercent(value: number | null | undefined): string {
  return value == null ? NO_DATA : `${Math.round(value)}%`
}

/** `4.2h`. Sin datos, `—`. */
export function formatHours(value: number | null | undefined): string {
  return value == null ? NO_DATA : `${trimNumber(value)}h`
}

/** Número con signo (`+5pp`, `-0.8h`, `+14`). El cero va sin signo. */
export function formatSigned(value: number, unit = '', decimals = 1): string {
  const rounded = trimNumber(value, decimals)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  return `${sign}${Math.abs(rounded)}${unit}`
}

/** Colores de avatar: a cada persona le toca siempre el mismo según su id. */
const AVATAR_COLORS = ['#28ceab', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6']

export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]!
}

/**
 * Polilíneas que escalan la serie al alto/ancho dado (con un pequeño margen vertical).
 * Los `null` cortan la línea: cada tramo continuo es una polilínea y un punto aislado se dibuja como un trazo mínimo.
 */
export function buildTrendSegments(series: (number | null)[], width: number, height: number): string[] {
  const values = series.filter((value): value is number => value != null)
  if (values.length === 0) {
    return []
  }

  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mid = (max + min) / 2
  // Un rango mínimo (20% del valor) evita que variaciones pequeñas se vean como picos.
  const range = Math.max(max - min, Math.abs(max) * 0.2) || 1
  const step = series.length > 1 ? width / (series.length - 1) : 0
  const offset = series.length > 1 ? 0 : width / 2

  const segments: string[] = []
  let run: { x: number, y: number }[] = []

  const flush = () => {
    if (run.length === 1) {
      // Punto aislado: un trazo de 1px; con `stroke-linecap: round` se ve como un punto.
      const only = run[0]!
      run = [{ x: only.x - 0.5, y: only.y }, { x: only.x + 0.5, y: only.y }]
    }
    if (run.length > 0) {
      segments.push(run.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
    }
    run = []
  }

  series.forEach((value, index) => {
    if (value == null) {
      flush()
      return
    }
    run.push({
      x: offset + index * step,
      y: height / 2 - ((value - mid) / range) * (height - pad * 2),
    })
  })
  flush()

  return segments
}
