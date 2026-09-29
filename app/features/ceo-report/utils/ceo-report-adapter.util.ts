import type {
  Report,
  ReportBreakdownMetric,
  ReportPeriodType,
} from '~/features/ceo-report/types/ceo-report-api.types'
import type {
  CeoCategory,
  CeoKpiRow,
  CeoPerson,
  CeoReport,
  CeoTeam,
  CeoTone,
  CeoTrend,
} from '~/features/ceo-report/types/ceo-report.types'
import { ratingFromScore } from '~/features/ceo-report/utils/ceo-report.util'

export type Translate = (key: string, named?: Record<string, unknown>) => string

interface AdapterContext {
  t: Translate
  locale: string
  /** Nombre de la empresa del reporte. */
  scopeLabel: string
}

const PALETTE = ['#28ceab', '#7c3aed', '#0ea5e9', '#f59e0b', '#ec4899', '#84cc16', '#f97316', '#14b8a6']
const NO_VALUE = '—'
const PEOPLE_RANKING_SIZE = 5

function colorAt(index: number): string {
  return PALETTE[index % PALETTE.length]!
}

/** `YYYY-MM-DD` como fecha local (evita el corrimiento de un día por zona horaria). */
export function parseIsoDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}

export function formatPeriodLabel(
  report: Pick<Report, 'period_type' | 'period_start' | 'period_end'>,
  locale: string,
): string {
  const start = parseIsoDate(report.period_start)
  const end = parseIsoDate(report.period_end)

  if (report.period_type === 'monthly') {
    return capitalize(new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(start))
  }

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  if (report.period_start === report.period_end) {
    return formatter.format(start)
  }
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

/** Etiqueta corta para el selector de historial: «Septiembre de 2026 · Mensual». */
export function formatReportOption(
  report: Pick<Report, 'period_type' | 'period_start' | 'period_end'>,
  locale: string,
  periodTypeLabel: (type: ReportPeriodType) => string,
): string {
  return `${formatPeriodLabel(report, locale)} · ${periodTypeLabel(report.period_type)}`
}

function percent(value: number | null): string {
  return value == null ? NO_VALUE : `${value}%`
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function arrowOf(value: number): string {
  if (value > 0) {
    return '↑'
  }
  return value < 0 ? '↓' : '→'
}

function trendOf(delta: number | null | undefined): CeoTrend | undefined {
  if (delta == null) {
    return undefined
  }
  if (delta > 0) {
    return 'up'
  }
  return delta < 0 ? 'down' : 'stable'
}

/** Texto del cambio contra el período anterior; `undefined` si no hay con qué comparar. */
function deltaLabel(delta: number | null | undefined, unit: 'points' | 'days', t: Translate): string | undefined {
  if (delta == null) {
    return undefined
  }
  if (delta === 0) {
    return `→ ${t('ceoReport.delta.stable')}`
  }
  return `${arrowOf(delta)} ${t(`ceoReport.delta.${unit}`, { value: signed(delta) })}`
}

/** `higherIsBetter = false` para métricas donde bajar es mejorar (tiempo de resolución). */
function toneOf(delta: number | null | undefined, higherIsBetter: boolean): CeoTone {
  if (delta == null || delta === 0) {
    return 'neutral'
  }
  return (delta > 0) === higherIsBetter ? 'good' : 'bad'
}

function daysLabel(value: number | null, t: Translate): string {
  return value == null ? NO_VALUE : t('ceoReport.units.days', { n: value })
}

function buildKpis(report: Report, { t }: AdapterContext): CeoKpiRow[] {
  const { metrics } = report
  const delta = metrics.delta_vs_previous
  const punctualBase = metrics.completed_tasks - metrics.punctuality_excluded

  const completionFact = t('ceoReport.facts.completion', {
    completed: metrics.completed_tasks,
    total: metrics.total_tasks,
  })
  const punctualityFact = metrics.punctuality_rate == null
    ? t('ceoReport.facts.noData')
    : [
        t('ceoReport.facts.punctuality', { base: punctualBase }),
        metrics.punctuality_excluded > 0
          ? t('ceoReport.facts.punctualityExcluded', { n: metrics.punctuality_excluded })
          : '',
      ].filter(Boolean).join(' ')
  const resolutionFact = metrics.avg_resolution_days == null
    ? t('ceoReport.facts.noData')
    : t('ceoReport.facts.resolution')

  return [
    {
      key: 'tct',
      label: t('ceoReport.kpis.tct'),
      value: percent(metrics.completion_rate),
      progress: metrics.completion_rate ?? undefined,
      trend: trendOf(delta?.completion_rate),
      trendLabel: delta ? t(`ceoReport.trend.${trendOf(delta.completion_rate) ?? 'stable'}`) : undefined,
      accent: 'teal',
      whatHappened: completionFact,
    },
    {
      key: 'tc',
      label: t('ceoReport.kpis.tc'),
      value: percent(metrics.punctuality_rate),
      progress: metrics.punctuality_rate ?? undefined,
      trend: trendOf(delta?.punctuality_rate),
      trendLabel: delta ? t(`ceoReport.trend.${trendOf(delta.punctuality_rate) ?? 'stable'}`) : undefined,
      accent: 'teal',
      whatHappened: punctualityFact,
    },
    {
      key: 'tpr',
      label: t('ceoReport.kpis.tpr'),
      value: daysLabel(metrics.avg_resolution_days, t),
      trend: trendOf(delta?.avg_resolution_days),
      trendLabel: delta ? t(`ceoReport.trend.${trendOf(delta.avg_resolution_days) ?? 'stable'}`) : undefined,
      accent: 'green',
      whatHappened: resolutionFact,
    },
  ]
}

function completionOf(row: ReportBreakdownMetric): number {
  return row.completion_rate ?? 0
}

function buildTeams(rows: ReportBreakdownMetric[], { t }: AdapterContext): CeoTeam[] {
  return rows.map((row, index) => ({
    name: row.name,
    color: colorAt(index),
    rating: ratingFromScore(completionOf(row)),
    completion: completionOf(row),
    punctuality: row.punctuality_rate,
    tasks: row.total_tasks,
    avgResolution: daysLabel(row.avg_resolution_days, t),
  }))
}

function buildCategories(rows: ReportBreakdownMetric[], { t }: AdapterContext): CeoCategory[] {
  return rows.map(row => ({
    name: row.name,
    rating: ratingFromScore(completionOf(row)),
    completion: completionOf(row),
    avgResolution: daysLabel(row.avg_resolution_days, t),
  }))
}

function toPerson(row: ReportBreakdownMetric, index: number): CeoPerson {
  return {
    name: row.name,
    avatarColor: colorAt(index),
    completion: completionOf(row),
    punctuality: row.punctuality_rate,
    tasks: row.total_tasks,
  }
}

/** Mejores y peores por completación (a igualdad, la de más tareas primero). Sin solaparse. */
function buildPeople(rows: ReportBreakdownMetric[]): { top: CeoPerson[], bottom: CeoPerson[] } {
  const ranked = [...rows].sort((a, b) =>
    completionOf(b) - completionOf(a) || b.total_tasks - a.total_tasks)
  const people = ranked.map(toPerson)

  const top = people.slice(0, PEOPLE_RANKING_SIZE)
  const rest = people.slice(PEOPLE_RANKING_SIZE)
  const bottom = rest.slice(-PEOPLE_RANKING_SIZE).reverse()
  return { top, bottom }
}

export function buildCeoReport(report: Report, context: AdapterContext): CeoReport {
  const { t, locale, scopeLabel } = context
  const { metrics } = report
  const delta = metrics.delta_vs_previous

  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(report.updated_at))

  return {
    meta: {
      periodLabel: formatPeriodLabel(report, locale),
      scopeLabel,
      teamsCount: metrics.by_team.length,
      tasksCount: metrics.total_tasks,
      generatedAt,
      comparisonLabel: delta
        ? t('ceoReport.comparison.previous')
        : t('ceoReport.comparison.none'),
      confidentialityLabel: t('ceoReport.confidentiality'),
    },
    hero: {
      value: metrics.completion_rate ?? 0,
      rating: ratingFromScore(metrics.completion_rate ?? 0),
      deltaLabel: deltaLabel(delta?.completion_rate, 'points', t),
      side: [
        {
          label: t('ceoReport.kpis.tc'),
          value: percent(metrics.punctuality_rate),
          deltaLabel: deltaLabel(delta?.punctuality_rate, 'points', t),
          tone: toneOf(delta?.punctuality_rate, true),
        },
        {
          label: t('ceoReport.kpis.created'),
          value: String(metrics.total_tasks),
          tone: 'neutral',
        },
        {
          label: t('ceoReport.kpis.tpr'),
          value: daysLabel(metrics.avg_resolution_days, t),
          deltaLabel: deltaLabel(delta?.avg_resolution_days, 'days', t),
          tone: toneOf(delta?.avg_resolution_days, false),
        },
      ],
    },
    kpis: buildKpis(report, context),
    teams: { items: buildTeams(metrics.by_team, context) },
    categories: { items: buildCategories(metrics.by_project, context) },
    people: buildPeople(metrics.by_person),
  }
}

/** Parte `items` en bloques: el primero de `firstSize` y los demás de `restSize`. */
export function chunkItems<T>(items: T[], firstSize: number, restSize: number): T[][] {
  if (!items.length) {
    return []
  }
  const chunks: T[][] = [items.slice(0, firstSize)]
  for (let index = firstSize; index < items.length; index += restSize) {
    chunks.push(items.slice(index, index + restSize))
  }
  return chunks
}

/** `Date` local -> `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Último período completo de ese tipo (ayer, la semana lunes-domingo pasada o el mes pasado). */
export function defaultPeriodRange(type: ReportPeriodType, today = new Date()): { start: string, end: string } {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (type === 'daily') {
    base.setDate(base.getDate() - 1)
    return { start: toIsoDate(base), end: toIsoDate(base) }
  }

  if (type === 'weekly') {
    const sinceMonday = (base.getDay() + 6) % 7
    const end = new Date(base)
    end.setDate(base.getDate() - sinceMonday - 1)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    return { start: toIsoDate(start), end: toIsoDate(end) }
  }

  const start = new Date(base.getFullYear(), base.getMonth() - 1, 1)
  const end = new Date(base.getFullYear(), base.getMonth(), 0)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}
