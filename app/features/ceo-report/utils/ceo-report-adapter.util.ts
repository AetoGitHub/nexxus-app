import type {
  Report,
  ReportBreakdownMetric,
  ReportPerformanceBucket,
  ReportPeriodType,
} from '~/features/ceo-report/types/ceo-report-api.types'
import type {
  CeoAiReview,
  CeoCategory,
  CeoClosing,
  CeoDecision,
  CeoDistribution,
  CeoKpiRow,
  CeoNarrative,
  CeoPerson,
  CeoRating,
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
  /** Dibuja el texto de IA aunque n8n lo haya marcado `needs_review` o mandado `warnings` (decisión explícita de quien lo revisó). */
  allowUnreviewed?: boolean
}

/** Notas de la IA por id (`team_notes`, `theme_notes`, `person_notes`); las ids son las del reporte. */
type NotesById = Record<string, string>

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

function buildTeams(rows: ReportBreakdownMetric[], { t }: AdapterContext, notes: NotesById = {}): CeoTeam[] {
  return rows.map((row, index) => ({
    id: row.id,
    ...noteFields(notes[String(row.id)], t),
    name: row.name,
    color: colorAt(index),
    rating: ratingFromScore(completionOf(row)),
    completion: completionOf(row),
    punctuality: row.punctuality_rate,
    tasks: row.total_tasks,
    avgResolution: daysLabel(row.avg_resolution_days, t),
  }))
}

function buildCategories(rows: ReportBreakdownMetric[], { t }: AdapterContext, notes: NotesById = {}): CeoCategory[] {
  return rows.map(row => ({
    id: row.id,
    ...noteFields(notes[String(row.id)], t),
    name: row.name,
    rating: ratingFromScore(completionOf(row)),
    completion: completionOf(row),
    avgResolution: daysLabel(row.avg_resolution_days, t),
  }))
}

function toPerson(row: ReportBreakdownMetric, index: number, notes: NotesById): CeoPerson {
  return {
    id: row.id,
    note: notes[String(row.id)],
    name: row.name,
    avatarColor: colorAt(index),
    completion: completionOf(row),
    punctuality: row.punctuality_rate,
    tasks: row.total_tasks,
  }
}

/** Mejores y peores por completación (a igualdad, la de más tareas primero). Sin solaparse. */
function buildPeople(rows: ReportBreakdownMetric[], notes: NotesById = {}): { top: CeoPerson[], bottom: CeoPerson[] } {
  const ranked = [...rows].sort((a, b) =>
    completionOf(b) - completionOf(a) || b.total_tasks - a.total_tasks)
  const people = ranked.map((row, index) => toPerson(row, index, notes))

  const top = people.slice(0, PEOPLE_RANKING_SIZE)
  const rest = people.slice(PEOPLE_RANKING_SIZE)
  const bottom = rest.slice(-PEOPLE_RANKING_SIZE).reverse()
  return { top, bottom }
}

/** `reason` y su título cuando la IA escribió algo sobre ese equipo o proyecto. */
function noteFields(note: string | undefined, t: Translate): { reason?: string, reasonTitle?: string } {
  return note ? { reason: note, reasonTitle: t('ceoReport.notes.title') } : {}
}

/** Nombre de cada persona por id: el nombre completo de la distribución y, si falta, el de `by_person`. */
function personNames(metrics: Report['metrics']): Map<number, string> {
  const names = new Map<number, string>()
  for (const row of metrics.by_person) {
    names.set(row.id, row.name)
  }
  for (const bucket of metrics.performance_distribution ?? []) {
    for (const person of bucket.people ?? []) {
      if (person.name) {
        names.set(person.id, person.name)
      }
    }
  }
  return names
}

export function buildCeoReport(report: Report, context: AdapterContext): CeoReport {
  const { t, locale, scopeLabel } = context
  const { metrics } = report
  const delta = metrics.delta_vs_previous

  const parsed = parseNarrative(report.narrative, locale)
  const blocked = parsed.review != null && !(context.allowUnreviewed && parsed.review.state === 'review')
  // Texto de IA que se dibuja: nada si está por revisar (sin permiso) o con error.
  const ai = blocked ? null : parsed
  const noNotes: NotesById = {}

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
    teams: { items: buildTeams(metrics.by_team, context, ai?.teamNotes ?? noNotes) },
    categories: { items: buildCategories(metrics.by_project, context, ai?.themeNotes ?? noNotes) },
    people: {
      ...buildPeople(metrics.by_person, ai?.personNotes ?? noNotes),
      distribution: buildDistribution(metrics.performance_distribution),
    },
    narrative: ai?.narrative ?? null,
    aiReview: parsed.review,
    closing: ai ? buildClosing(ai, personNames(metrics), context) : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => nonEmptyString(item)).filter((item): item is string => item != null)
    : []
}

/** `{ "1": "texto" }` -> solo las entradas con texto. */
function notesOf(value: unknown): NotesById {
  if (!isRecord(value)) {
    return {}
  }
  const notes: NotesById = {}
  for (const [id, text] of Object.entries(value)) {
    const note = nonEmptyString(text)
    if (note) {
      notes[id] = note
    }
  }
  return notes
}

interface RawDecision {
  title: string
  description?: string
  assigneeId: number | null
  metric?: string
  dueDate: string | null
  needsReview: boolean
}

interface ParsedNarrative {
  narrative: CeoNarrative | null
  teamNotes: NotesById
  themeNotes: NotesById
  personNotes: NotesById
  closing?: { headline?: string, callout?: string, paragraphs: string[] }
  decisions: RawDecision[]
  /** Presente cuando el texto no debe dibujarse tal cual (por revisar o con error). */
  review?: CeoAiReview
}

function parseDecisions(value: unknown): RawDecision[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }
    const title = nonEmptyString(item.title)
    if (!title) {
      return []
    }
    const dueDate = nonEmptyString(item.due_date)
    return [{
      title,
      description: nonEmptyString(item.description),
      assigneeId: typeof item.assignee_id === 'number' ? item.assignee_id : null,
      metric: nonEmptyString(item.metric),
      dueDate: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
      needsReview: item.needs_review === true,
    }]
  })
}

/**
 * Valida el `narrative` de la API (el que guarda el backend con el callback de n8n; también acepta el cuerpo completo
 * del callback con el texto dentro de `narrative`). Devuelve `narrative: null` si no trae ninguna sección utilizable;
 * las secciones que falten quedan `undefined` y se dibujan «en preparación». Con `needs_review` en `true`, con
 * `warnings` o con `status: 'error'` marca `review`: el texto no debe dibujarse hasta que alguien lo revise.
 */
export function parseNarrative(raw: unknown, locale: string): ParsedNarrative {
  const empty: ParsedNarrative = { narrative: null, teamNotes: {}, themeNotes: {}, personNotes: {}, decisions: [] }
  if (!isRecord(raw)) {
    return empty
  }

  // El callback manda { report_id, status, needs_review, narrative: {...}, warnings }; el backend puede guardar eso o solo el texto.
  const body = isRecord(raw.narrative) ? raw.narrative : raw
  const pick = (key: string) => (raw[key] !== undefined ? raw[key] : body[key])

  if (pick('status') === 'error') {
    return { ...empty, review: { state: 'error', warnings: [], error: nonEmptyString(pick('error')) } }
  }

  const warnings = stringList(pick('warnings'))
  const needsReview = pick('needs_review') === true || warnings.length > 0

  const verdict = nonEmptyString(body.verdict)
  const insights = Array.isArray(body.insights)
    ? body.insights.flatMap((item) => {
        const text = isRecord(item) ? nonEmptyString(item.text) : undefined
        return text && isRecord(item)
          ? [{ text, metric: nonEmptyString(item.metric), team: nonEmptyString(item.team) }]
          : []
      })
    : []

  const closingRaw = isRecord(body.closing) ? body.closing : null
  const closing = closingRaw
    ? {
        headline: nonEmptyString(closingRaw.headline),
        callout: nonEmptyString(closingRaw.callout),
        paragraphs: stringList(closingRaw.paragraphs),
      }
    : undefined
  const hasClosing = closing != null && (closing.headline != null || closing.paragraphs.length > 0)
  const decisions = parseDecisions(body.decisions)

  const teamNotes = notesOf(body.team_notes)
  const themeNotes = notesOf(body.theme_notes)
  const personNotes = notesOf(body.person_notes)
  const hasContent = verdict != null
    || insights.length > 0
    || hasClosing
    || decisions.length > 0
    || [teamNotes, themeNotes, personNotes].some(notes => Object.keys(notes).length > 0)
  if (!hasContent) {
    return empty
  }

  const generatedAtRaw = nonEmptyString(body.generated_at)
  const generatedDate = generatedAtRaw ? new Date(generatedAtRaw) : null
  const generatedAt = generatedDate && !Number.isNaN(generatedDate.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(generatedDate)
    : undefined

  return {
    narrative: {
      model: nonEmptyString(body.model),
      generatedAt,
      verdict,
      insights: insights.length
        ? insights.map((item, index) => ({ index: String(index + 1).padStart(2, '0'), ...item }))
        : undefined,
    },
    teamNotes,
    themeNotes,
    personNotes,
    closing: hasClosing ? closing : undefined,
    decisions,
    review: needsReview ? { state: 'review', warnings } : undefined,
  }
}

/** Hojas de cierre: resumen (titular, destacado y párrafos) y decisiones; sin ninguno de los dos no hay cierre. */
function buildClosing(parsed: ParsedNarrative, names: Map<number, string>, { t, locale }: AdapterContext): CeoClosing | undefined {
  if (!parsed.closing && !parsed.decisions.length) {
    return undefined
  }

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const decisions: CeoDecision[] = parsed.decisions.map((decision, index) => ({
    index: String(index + 1).padStart(2, '0'),
    title: decision.title,
    description: decision.description ?? '',
    assignee: decision.assigneeId != null ? (names.get(decision.assigneeId) ?? NO_VALUE) : NO_VALUE,
    metric: decision.metric ?? NO_VALUE,
    date: decision.dueDate ? formatter.format(parseIsoDate(decision.dueDate)) : NO_VALUE,
    assigneeId: decision.assigneeId,
    dueDate: decision.dueDate,
    needsReview: decision.needsReview,
  }))

  return {
    title: parsed.closing?.headline ?? t('ceoReport.closing.title'),
    quote: parsed.closing?.callout,
    paragraphs: parsed.closing?.paragraphs ?? [],
    hasSummary: parsed.closing != null,
    decisionsEyebrow: t('ceoReport.closing.decisionsEyebrow'),
    decisions,
    disclaimer: t('ceoReport.closing.disclaimer'),
  }
}

const RATINGS: readonly CeoRating[] = ['excellent', 'good', 'regular', 'critical']

/** «≥85%», «70–84%» o «<55%» a partir de los cortes de la API (`max_rate` es exclusivo salvo 100). */
function rangeLabelOf(bucket: ReportPerformanceBucket): string {
  if (bucket.max_rate >= 100) {
    return `≥${bucket.min_rate}%`
  }
  if (bucket.min_rate <= 0) {
    return `<${bucket.max_rate}%`
  }
  return `${bucket.min_rate}–${bucket.max_rate - 1}%`
}

/** `undefined` si el reporte es anterior a la distribución (no trae `performance_distribution`). */
function buildDistribution(buckets: ReportPerformanceBucket[] | undefined): CeoDistribution | undefined {
  if (!Array.isArray(buckets)) {
    return undefined
  }

  const valid = buckets
    .filter(bucket => RATINGS.includes(bucket.range))
    .map(bucket => ({
      range: bucket.range,
      rangeLabel: rangeLabelOf(bucket),
      count: bucket.count,
      people: (bucket.people ?? []).map(person => ({
        id: person.id,
        name: person.name,
        completion: person.completion_rate,
        tasks: person.total_tasks,
      })),
    }))
  if (!valid.length) {
    return undefined
  }

  return {
    buckets: valid,
    criticalCount: valid.find(bucket => bucket.range === 'critical')?.count ?? 0,
    maxCount: Math.max(...valid.map(bucket => bucket.count)),
    goal: buckets.find(bucket => bucket.range === 'excellent')?.min_rate,
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
