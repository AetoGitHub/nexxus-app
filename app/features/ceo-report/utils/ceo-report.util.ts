import type { CeoRating } from '~/features/ceo-report/types/ceo-report.types'

export const RATING_HEX: Record<CeoRating, string> = {
  excellent: '#16a34a',
  good: '#28ceab',
  regular: '#ca8a04',
  critical: '#dc2626',
}

/** Umbrales de la leyenda: excelente ≥85, bueno 70-84, regular 55-69, crítico <55. */
export function ratingFromScore(score: number): CeoRating {
  if (score >= 85) {
    return 'excellent'
  }
  if (score >= 70) {
    return 'good'
  }
  if (score >= 55) {
    return 'regular'
  }
  return 'critical'
}

export function buildSparklinePoints(series: number[], width: number, height: number, padding = 3): string {
  if (series.length < 2) {
    return ''
  }
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1
  const step = (width - padding * 2) / (series.length - 1)
  return series
    .map((value, index) => {
      const x = padding + index * step
      const y = padding + (1 - (value - min) / range) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function sparklineEnd(series: number[], width: number, height: number, padding = 3): { x: number, y: number } {
  const points = buildSparklinePoints(series, width, height, padding).split(' ')
  const last = points[points.length - 1]?.split(',') ?? ['0', '0']
  return { x: Number(last[0]), y: Number(last[1]) }
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}
