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

/** Nivel de una carga productiva en porcentaje: ≥85 excelente, 70-84 bueno, 55-69 regular, <55 crítico. */
export function loadTone(percent: number): DashboardTone {
  if (percent >= 85) {
    return 'excellent'
  }
  if (percent >= 70) {
    return 'good'
  }
  if (percent >= 55) {
    return 'warning'
  }
  return 'danger'
}

/** Puntos de una polilínea que escala la serie al alto/ancho dado (con un pequeño margen vertical). */
export function buildTrendPoints(series: number[], width: number, height: number): string {
  if (series.length === 0) {
    return ''
  }
  const pad = 2
  const min = Math.min(...series)
  const max = Math.max(...series)
  const mid = (max + min) / 2
  // Un rango mínimo (20% del valor) evita que variaciones pequeñas se vean como picos.
  const range = Math.max(max - min, Math.abs(max) * 0.2) || 1
  const step = series.length > 1 ? width / (series.length - 1) : 0

  return series
    .map((value, index) => {
      const x = index * step
      const y = height / 2 - ((value - mid) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
